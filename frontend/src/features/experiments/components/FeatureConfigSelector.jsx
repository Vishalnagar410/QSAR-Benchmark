import { useState } from 'react'
import { Sparkles } from 'lucide-react'

export default function FeatureConfigSelector({ featureConfig, onChangeFeatureConfig }) {
  const {
    include_descriptors = true,
    include_morgan = false,
    fingerprint_radius = 2,
    fingerprint_n_bits = 2048,
    fingerprint_include_chirality = true,
  } = featureConfig

  function update(key, value) {
    onChangeFeatureConfig({
      ...featureConfig,
      [key]: value,
    })
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          Feature Representation
        </h3>
        <p className="text-xs text-slate-500">
          Choose whether to represent chemical structures using physicochemical descriptors, circular fingerprints, or both
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
            include_descriptors
              ? 'border-teal-600 bg-teal-50/30 ring-1 ring-teal-600 shadow-2xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <input
            checked={include_descriptors}
            className="mt-0.5 size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
            onChange={(e) => update('include_descriptors', e.target.checked)}
            type="checkbox"
          />
          <div>
            <span className="text-xs font-bold text-slate-900">
              1D / 2D Physicochemical Descriptors
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Calculates molecular weight, logP, TPSA, HBD, HBA, rotatable bonds, and atom counts.
            </p>
          </div>
        </label>

        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
            include_morgan
              ? 'border-teal-600 bg-teal-50/30 ring-1 ring-teal-600 shadow-2xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <input
            checked={include_morgan}
            className="mt-0.5 size-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
            onChange={(e) => update('include_morgan', e.target.checked)}
            type="checkbox"
          />
          <div>
            <span className="text-xs font-bold text-slate-900">
              Morgan Circular Fingerprints (ECFP)
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
              Encodes atom environments and connectivity into fixed-size bit vectors.
            </p>
          </div>
        </label>
      </div>

      {include_morgan && (
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-semibold text-slate-600 uppercase">
              Radius
            </label>
            <select
              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
              onChange={(e) => update('fingerprint_radius', Number(e.target.value))}
              value={fingerprint_radius}
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
              onChange={(e) => update('fingerprint_n_bits', Number(e.target.value))}
              value={fingerprint_n_bits}
            >
              <option value={512}>512 bits</option>
              <option value={1024}>1024 bits</option>
              <option value={2048}>2048 bits (Standard)</option>
            </select>
          </div>

          <div className="flex items-center pt-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                checked={fingerprint_include_chirality}
                className="size-3.5 rounded border-slate-300 text-teal-700"
                onChange={(e) => update('fingerprint_include_chirality', e.target.checked)}
                type="checkbox"
              />
              <span className="text-[11px] font-medium text-slate-700">Include Chirality</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
