import { useState } from 'react'
import { AlertCircle, CheckCircle2, Download, FlaskConical, Loader2, Sparkles } from 'lucide-react'
import { generateFeatures } from '../api/datasetsApi.js'

export default function FeatureGenerationPanel({ datasetId, endpoint, units, onFeaturesGenerated }) {
  const [includeDescriptors, setIncludeDescriptors] = useState(true)
  const [includeMorgan, setIncludeMorgan] = useState(false)
  const [radius, setRadius] = useState(2)
  const [nBits, setNBits] = useState(2048)
  const [includeChirality, setIncludeChirality] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [featureResult, setFeatureResult] = useState(null)
  const [downloading, setDownloading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)

    try {
      const payload = {
        endpoint: endpoint || null,
        units: units || null,
        feature_config: {
          include_descriptors: includeDescriptors,
          include_morgan: includeMorgan,
          fingerprint_radius: Number(radius),
          fingerprint_n_bits: Number(nBits),
          fingerprint_include_chirality: includeChirality,
        },
      }
      const result = await generateFeatures(datasetId, payload, 'json')
      setFeatureResult(result)
      onFeaturesGenerated?.(result)
    } catch (err) {
      setError(err.message || 'Feature generation failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadCsv() {
    setDownloading(true)
    try {
      const payload = {
        endpoint: endpoint || null,
        units: units || null,
        feature_config: {
          include_descriptors: includeDescriptors,
          include_morgan: includeMorgan,
          fingerprint_radius: Number(radius),
          fingerprint_n_bits: Number(nBits),
          fingerprint_include_chirality: includeChirality,
        },
      }
      const blob = await generateFeatures(datasetId, payload, 'csv')
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${datasetId}-features.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download features CSV: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Molecular Feature Engineering
          </h3>
          <p className="text-xs text-slate-500">
            Generate 1D/2D physicochemical descriptors and circular Morgan fingerprints via RDKit
          </p>
        </div>

        <div className="flex items-center gap-2">
          {featureResult && (
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
              disabled={downloading}
              onClick={handleDownloadCsv}
              type="button"
            >
              <Download size={14} />
              {downloading ? 'Downloading...' : 'Export Features CSV'}
            </button>
          )}

          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50"
            disabled={loading || (!includeDescriptors && !includeMorgan)}
            onClick={handleGenerate}
            type="button"
          >
            {loading ? (
              <>
                <Loader2 aria-hidden="true" className="animate-spin" size={14} />
                Computing Features...
              </>
            ) : (
              <>
                <Sparkles aria-hidden="true" size={14} />
                Calculate Features
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertCircle className="shrink-0 text-rose-600" size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Feature Configuration Options */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Descriptors */}
        <div className="rounded-lg border border-slate-200 p-3.5">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              checked={includeDescriptors}
              className="mt-0.5 size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              onChange={(e) => setIncludeDescriptors(e.target.checked)}
              type="checkbox"
            />
            <div>
              <span className="text-xs font-semibold text-slate-900">
                Physicochemical Descriptors
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                Compute MolWt, MolLogP, TPSA, HBD, HBA, NumRotatableBonds, and heavy atom counts.
              </p>
            </div>
          </label>
        </div>

        {/* Morgan Fingerprints */}
        <div className="rounded-lg border border-slate-200 p-3.5 space-y-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              checked={includeMorgan}
              className="mt-0.5 size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
              onChange={(e) => setIncludeMorgan(e.target.checked)}
              type="checkbox"
            />
            <div>
              <span className="text-xs font-semibold text-slate-900">
                Circular Morgan Fingerprints (ECFP)
              </span>
              <p className="mt-0.5 text-[11px] text-slate-500 leading-normal">
                Encode local chemical environments and atom connectivity into bit vectors.
              </p>
            </div>
          </label>

          {includeMorgan && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase">
                  Radius
                </label>
                <select
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  onChange={(e) => setRadius(Number(e.target.value))}
                  value={radius}
                >
                  <option value={1}>1 (ECFP2)</option>
                  <option value={2}>2 (ECFP4 - Recommended)</option>
                  <option value={3}>3 (ECFP6)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-600 uppercase">
                  Bit Length
                </label>
                <select
                  className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  onChange={(e) => setNBits(Number(e.target.value))}
                  value={nBits}
                >
                  <option value={512}>512 bits</option>
                  <option value={1024}>1024 bits</option>
                  <option value={2048}>2048 bits (Standard)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature Generation Summary */}
      {featureResult && (
        <div className="rounded-lg border border-teal-200 bg-teal-50/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-900">
            <CheckCircle2 size={16} className="text-teal-700" />
            <span>Features Calculated for {featureResult.record_count} Compounds</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {featureResult.feature_names?.map((name) => (
              <span
                className="rounded bg-teal-100/80 px-2 py-0.5 font-mono text-[10px] font-medium text-teal-800"
                key={name}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
