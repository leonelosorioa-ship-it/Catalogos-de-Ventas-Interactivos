import { useState, type ChangeEvent } from 'react';
import { Check, FileImage, Loader2, Sparkles, Upload, X } from 'lucide-react';
import {
  formatCOP,
  parseBulkCatalogText,
  type Product,
} from '../utils/catalogLogic';

interface MagicImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportProducts: (items: Omit<Product, 'id'>[]) => void;
}

const SAMPLE_BULK_TEXT = `1. Reloj Chrono Titanium Azul - $195.000
2. Reloj Minimalist Noir Correa Piel | $132.000 | $180.000 | Caballero
3. Reloj Solare Oro Rosa Dama | $148.000 | $198.000 | Dama
4. Reloj Nautic Diver Acero 316L - $225.000
5. Reloj Venezia Perla Eslabones Dama - $139.000`;

export function MagicImportModal({
  isOpen,
  onClose,
  onImportProducts,
}: MagicImportModalProps) {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [rawText, setRawText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<Omit<Product, 'id'>[]>([]);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setNoticeMsg(null);
    setImageMimeType(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImagePreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProcessInstantRegex = () => {
    setErrorMsg(null);
    setNoticeMsg(null);
    if (!rawText.trim()) {
      setErrorMsg('Pega al menos una línea de productos con nombre y precio.');
      return;
    }
    const items = parseBulkCatalogText(rawText);
    if (items.length === 0) {
      setErrorMsg('No pudimos detectar productos válidos en el texto ingresado.');
      return;
    }
    setPreviewItems(items);
    setNoticeMsg(`${items.length} productos detectados al instante.`);
  };

  const handleProcessWithAI = async () => {
    setErrorMsg(null);
    setNoticeMsg(null);

    if (mode === 'text' && !rawText.trim()) {
      setErrorMsg('Pega tu lista de productos o carga el ejemplo antes de procesar.');
      return;
    }
    if (mode === 'image' && !imagePreview) {
      setErrorMsg('Selecciona una imagen de tu catálogo o lista de precios.');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/extract-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: mode === 'text' ? rawText : undefined,
          imageBase64: mode === 'image' ? imagePreview : undefined,
          mimeType: mode === 'image' ? imageMimeType : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (mode === 'text' && data.fallbackAvailable) {
          const fallbackItems = parseBulkCatalogText(rawText);
          if (fallbackItems.length > 0) {
            setPreviewItems(fallbackItems);
            setNoticeMsg(
              `Procesado localmente en modo rápido (${fallbackItems.length} productos detectados).`
            );
            return;
          }
        }
        setErrorMsg(data.error || 'No se pudo procesar el catálogo.');
        return;
      }

      if (Array.isArray(data.products) && data.products.length > 0) {
        setPreviewItems(data.products);
        setNoticeMsg(
          `${data.products.length} productos extraídos con IA (${data.source || 'Gemini'}).`
        );
      } else {
        setErrorMsg('La IA no detectó productos estructurados en el contenido.');
      }
    } catch {
      if (mode === 'text') {
        const fallbackItems = parseBulkCatalogText(rawText);
        if (fallbackItems.length > 0) {
          setPreviewItems(fallbackItems);
          setNoticeMsg(
            `Procesado localmente (${fallbackItems.length} productos detectados).`
          );
          return;
        }
      }
      setErrorMsg('Error de conexión al procesar el catálogo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = () => {
    if (previewItems.length === 0) return;
    onImportProducts(previewItems);
    setPreviewItems([]);
    setRawText('');
    setImagePreview(null);
    setNoticeMsg(null);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="magic-import-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl">
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-600 shrink-0" aria-hidden="true" />
            <h2 id="magic-import-title" className="font-display text-lg font-bold text-slate-900">
              Importación Mágica con IA
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de importación"
            className="min-h-[40px] min-w-[40px] rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600">
            Carga hasta 50 productos en segundos pegando una lista de texto libre o subiendo una
            imagen de tu catálogo. Calculamos automáticamente el precio de anclaje sugerido si falta.
          </p>

          {/* Segmented mode selector */}
          <div className="inline-flex p-1 rounded-lg bg-slate-100 gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('text');
                setErrorMsg(null);
              }}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                mode === 'text'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Texto libre / WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('image');
                setErrorMsg(null);
              }}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                mode === 'image'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lectura de imagen con IA
            </button>
          </div>

          {mode === 'text' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="bulk-import-textarea"
                  className="text-xs font-semibold text-slate-700"
                >
                  Lista de productos (un producto por línea)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRawText(SAMPLE_BULK_TEXT);
                    setErrorMsg(null);
                  }}
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  Cargar ejemplo de 5 relojes
                </button>
              </div>
              <textarea
                id="bulk-import-textarea"
                rows={6}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={'1. Reloj de Oro - $200.000\n2. Reloj de Plata - $100.000'}
                className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-600 font-mono"
              />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleProcessInstantRegex}
                  disabled={isProcessing}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Procesar al instante
                </button>
                <button
                  type="button"
                  onClick={handleProcessWithAI}
                  disabled={isProcessing}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-cyan-600" aria-hidden="true" />
                  )}
                  <span>Enriquecer con Gemini IA</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label
                htmlFor="catalog-image-upload"
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 p-6 cursor-pointer transition-colors"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Vista previa de imagen a analizar"
                    className="max-h-48 rounded-lg object-contain mb-3"
                  />
                ) : (
                  <FileImage className="w-8 h-8 text-slate-400 mb-2" aria-hidden="true" />
                )}
                <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <Upload className="w-4 h-4" aria-hidden="true" />
                  {imagePreview ? 'Cambiar imagen de catálogo' : 'Subir foto de lista o catálogo'}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  PNG, JPG o WEBP · Lectura directa con IA Multimodal
                </span>
                <input
                  id="catalog-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={handleProcessWithAI}
                disabled={isProcessing || !imagePreview}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="w-4 h-4 text-cyan-400" aria-hidden="true" />
                )}
                <span>{isProcessing ? 'Analizando imagen...' : 'Extraer productos de imagen'}</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-800 font-medium">
              {errorMsg}
            </div>
          )}

          {noticeMsg && (
            <div role="status" className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>{noticeMsg}</span>
            </div>
          )}

          {previewItems.length > 0 && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Vista previa ({previewItems.length} artículos listos)</span>
                <span>Precio actual / Anclaje</span>
              </div>
              <ul className="divide-y divide-slate-200 max-h-56 overflow-y-auto">
                {previewItems.map((item, idx) => (
                  <li
                    key={`${item.nombre}-${idx}`}
                    className="px-4 py-2.5 flex items-center justify-between gap-4 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{item.nombre}</p>
                      <p className="text-xs text-slate-500">{item.categoria}</p>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <span className="font-semibold text-slate-900">
                        {formatCOP(item.precioActual)}
                      </span>{' '}
                      <span className="text-xs text-slate-400 line-through">
                        {formatCOP(item.precioAnterior)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewItems([])}
                  className="min-h-[40px] px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="min-h-[40px] px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-semibold transition-colors"
                >
                  Añadir {previewItems.length} productos al inventario
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
