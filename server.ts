import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_CATALOGS_FILE = path.join('/tmp', 'leps_public_catalogs_v1.json');

interface StoredCatalogPayload {
  id: string;
  config: {
    subdominio?: string;
    dominioBase?: string;
    [key: string]: unknown;
  };
  products: unknown[];
  updatedAt?: string;
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const publicCatalogRegistry = new Map<string, StoredCatalogPayload>();

function hydrateCatalogRegistry() {
  try {
    if (fs.existsSync(PUBLIC_CATALOGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PUBLIC_CATALOGS_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        for (const item of parsed as StoredCatalogPayload[]) {
          const slug = normalizeSlug(item?.config?.subdominio || '');
          if (slug) publicCatalogRegistry.set(slug, item);
        }
      }
    }
  } catch {
    // ignore corrupt cache file
  }
}

function persistCatalogRegistry() {
  try {
    fs.writeFileSync(
      PUBLIC_CATALOGS_FILE,
      JSON.stringify(Array.from(publicCatalogRegistry.values())),
      'utf8'
    );
  } catch {
    // ignore disk write limits
  }
}

hydrateCatalogRegistry();

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/public/catalogs/sync', (req, res) => {
    const { catalogs } = req.body as { catalogs?: StoredCatalogPayload[] };
    if (!Array.isArray(catalogs)) {
      res.status(400).json({ error: 'Lista de catálogos inválida.' });
      return;
    }
    for (const cat of catalogs.slice(0, 100)) {
      const slug = normalizeSlug(cat?.config?.subdominio || '');
      if (slug && cat?.config && Array.isArray(cat?.products)) {
        publicCatalogRegistry.set(slug, cat);
      }
    }
    persistCatalogRegistry();
    res.json({ synced: publicCatalogRegistry.size });
  });

  app.get('/api/public/catalog', (req, res) => {
    const querySlug =
      typeof req.query.slug === 'string' ? normalizeSlug(req.query.slug) : '';
    const forwardedHost =
      (typeof req.headers['x-forwarded-host'] === 'string'
        ? req.headers['x-forwarded-host']
        : req.headers.host) || '';
    const hostFirstLabel = normalizeSlug(forwardedHost.split(':')[0].split('.')[0] || '');
    const targetSlug = querySlug || hostFirstLabel;

    if (!targetSlug) {
      res.status(404).json({ error: 'Catálogo no especificado.' });
      return;
    }

    const found = publicCatalogRegistry.get(targetSlug);
    if (!found) {
      res.status(404).json({ error: 'Catálogo no encontrado.' });
      return;
    }

    res.json({ catalog: found });
  });

  app.post('/api/ai/extract-catalog', async (req, res) => {
    try {
      const { text, imageBase64, mimeType } = req.body as {
        text?: string;
        imageBase64?: string;
        mimeType?: string;
      };

      if ((!text || !text.trim()) && !imageBase64) {
        res.status(400).json({
          error: 'Proporciona texto de inventario o una imagen para analizar.',
        });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'El servicio de IA multimodal requiere una clave GEMINI_API_KEY configurada en el entorno.',
          fallbackAvailable: true,
        });
        return;
      }

      const parts: Array<
        | { text: string }
        | { inlineData: { mimeType: string; data: string } }
      > = [];

      if (imageBase64) {
        const cleanBase64 = imageBase64.includes(',')
          ? imageBase64.split(',')[1]
          : imageBase64;
        parts.push({
          inlineData: {
            mimeType: mimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
      }

      const instructionPrompt = [
        'Extrae hasta 50 productos de comercio minorista a partir del texto o imagen adjunta.',
        'Devuelve precios numéricos enteros en pesos (sin símbolos ni separadores).',
        'Si solo hay un precio, asigna un precioAnterior (precio de anclaje tachado) entre 20% y 35% superior al precioActual.',
        'Clasifica cada producto en una categoría corta y natural (ej. Caballero, Dama, Accesorios, General).',
        'Redacta una descripción comercial breve (10 a 22 palabras) enfocada en valor y materiales.',
        text && text.trim() ? `\nTexto fuente:\n${text.trim()}` : '',
      ].join(' ');

      parts.push({ text: instructionPrompt });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'Eres un extractor de catálogos de e-commerce de alta precisión. Responde únicamente con el JSON estructurado.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                nombre: {
                  type: Type.STRING,
                  description: 'Nombre limpio del producto.',
                },
                categoria: {
                  type: Type.STRING,
                  description: 'Categoría corta (ej. Caballero, Dama, Hogar).',
                },
                precioActual: {
                  type: Type.INTEGER,
                  description: 'Precio actual de venta en valor numérico entero.',
                },
                precioAnterior: {
                  type: Type.INTEGER,
                  description: 'Precio original de anclaje mayor al precioActual.',
                },
                descripcion: {
                  type: Type.STRING,
                  description: 'Descripción breve persuasiva del producto.',
                },
              },
              required: [
                'nombre',
                'categoria',
                'precioActual',
                'precioAnterior',
                'descripcion',
              ],
            },
          },
        },
      });

      const rawJson = (response.text ?? '[]').trim();
      const parsed = JSON.parse(rawJson);
      if (!Array.isArray(parsed)) {
        res.status(502).json({ error: 'Formato inesperado recibido de IA.' });
        return;
      }

      const normalized = parsed
        .filter((item) => item && typeof item.nombre === 'string' && item.nombre.trim())
        .slice(0, 50)
        .map((item) => {
          const actual = Math.max(1000, Math.round(Number(item.precioActual) || 0));
          const rawPrev = Math.round(Number(item.precioAnterior) || 0);
          const anterior = rawPrev > actual ? rawPrev : Math.round(actual * 1.3);
          return {
            nombre: String(item.nombre).trim(),
            categoria: String(item.categoria || 'General').trim(),
            precioActual: actual,
            precioAnterior: anterior,
            descripcion: String(
              item.descripcion || 'Artículo seleccionado con entrega inmediata.'
            ).trim(),
          };
        });

      res.json({ products: normalized, source: 'gemini-4-hydrogen' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error procesando catálogo con IA.';
      res.status(500).json({
        error: message,
        fallbackAvailable: true,
      });
    }
  });

  const distPath = path.resolve(__dirname, 'dist');
  const isProduction =
    process.env.NODE_ENV === 'production' || Boolean(process.env.K_SERVICE);

  if (isProduction && fs.existsSync(path.join(distPath, 'index.html'))) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Leps Commerce SaaS running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
