import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Field, TextInput } from '../components/ui/Field'
import { MapboxLocationField } from '../components/MapboxLocationField'
import { useToast } from '../components/ui/Toast'
import { blankInfo, useProjectStore } from '../store/useProjectStore'
import {
  PROJECT_TYPE_LABELS,
  type ProjectInfo,
  type ProjectType,
} from '../store/types'
import { TYPE_SPECIFIC_FIELDS } from '../store/projectTypeFields'
import { emptyField, type ProjectField } from '../lib/fieldState'

const ALL_TYPES = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]

export function Setup() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const createProject = useProjectStore((s) => s.createProject)

  const [phase, setPhase] = useState<1 | 2>(1)
  const [info, setInfo] = useState<ProjectInfo>(() => blankInfo())

  const typeFields = useMemo(
    () => TYPE_SPECIFIC_FIELDS[info.projectType] ?? [],
    [info.projectType],
  )

  function chooseType(t: ProjectType) {
    setInfo((prev) => {
      const next = blankInfo(t)
      // preserve already-entered universal fields when switching type
      return {
        ...next,
        name: prev.name,
        client: prev.client,
        style: prev.style,
        budget: prev.budget,
        location: prev.location,
        colourPalette: prev.colourPalette,
        materialsToAvoid: prev.materialsToAvoid,
        compliance: prev.compliance,
        supplyChain: prev.supplyChain,
        mixedUseTypes: t === 'mixed-use' ? prev.mixedUseTypes : [],
      }
    })
  }

  function toggleMixed(t: ProjectType) {
    setInfo((prev) => {
      const has = prev.mixedUseTypes.includes(t)
      return {
        ...prev,
        mixedUseTypes: has
          ? prev.mixedUseTypes.filter((x) => x !== t)
          : [...prev.mixedUseTypes, t],
      }
    })
  }

  function setField<K extends keyof ProjectInfo>(key: K, value: ProjectInfo[K]) {
    setInfo((prev) => ({ ...prev, [key]: value }))
  }

  function setTypeField(id: string, value: ProjectField<string>) {
    setInfo((prev) => ({
      ...prev,
      typeSpecific: { ...prev.typeSpecific, [id]: value },
    }))
  }

  function confirm() {
    if (!info.name.trim()) {
      toast('Add a project name to continue', 'error')
      return
    }
    const id = createProject(info)
    toast('Project created', 'success')
    navigate(`/project/${id}`)
  }

  const canAdvance =
    info.projectType !== 'mixed-use' || info.mixedUseTypes.length > 0

  return (
    <AppShell crumbs={[{ label: 'New project' }]}>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2 text-caption text-muted">
          <span className={phase === 1 ? 'text-accent' : ''}>1 · Project type</span>
          <span className="text-faint">→</span>
          <span className={phase === 2 ? 'text-accent' : ''}>2 · Details</span>
        </div>

        {phase === 1 && (
          <section>
            <h1 className="text-display-md">What kind of project?</h1>
            <p className="mt-2 text-body text-muted">
              This tailors the brief and the questions Claude researches against.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ALL_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => chooseType(t)}
                  className={[
                    'rounded-md border px-4 py-5 text-left text-label transition-colors',
                    info.projectType === t
                      ? 'border-accent bg-accent/10 text-ink'
                      : 'border-border bg-card text-muted hover:border-faint hover:text-ink',
                  ].join(' ')}
                >
                  {PROJECT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {info.projectType === 'mixed-use' && (
              <Card className="mt-6 p-5">
                <p className="mb-3 text-body text-muted">
                  Which uses are combined?
                </p>
                <div className="flex flex-wrap gap-2">
                  {ALL_TYPES.filter((t) => t !== 'mixed-use').map((t) => (
                    <button
                      key={t}
                      onClick={() => toggleMixed(t)}
                      className={[
                        'rounded-pill border px-3 py-1 text-caption transition-colors',
                        info.mixedUseTypes.includes(t)
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-border text-muted hover:text-ink',
                      ].join(' ')}
                    >
                      {PROJECT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            <div className="mt-8 flex justify-end">
              <Button disabled={!canAdvance} onClick={() => setPhase(2)}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {phase === 2 && (
          <section>
            <h1 className="text-display-md">
              {PROJECT_TYPE_LABELS[info.projectType]} brief
            </h1>
            <p className="mt-2 text-body text-muted">
              Fill what you know. Use <span className="text-ink">Skip</span> or{' '}
              <span className="text-ink">N/A</span> on anything that doesn't apply.
            </p>

            <Card className="mt-8 grid gap-6 p-6">
              {/* Name — required, no skip */}
              <div>
                <label className="mb-1.5 block text-caption text-muted">
                  Project name <span className="text-reject">*</span>
                </label>
                <TextInput
                  value={info.name}
                  disabled={false}
                  onChange={(v) => setField('name', v)}
                  placeholder="e.g. Harbourview Boutique Hotel"
                />
              </div>

              <Field label="Client" field={info.client} onChange={(f) => setField('client', f)}>
                {({ value, disabled, setValue }) => (
                  <TextInput value={value} disabled={disabled} onChange={setValue} placeholder="Client / company" />
                )}
              </Field>

              <Field label="Style direction" field={info.style} onChange={(f) => setField('style', f)}>
                {({ value, disabled, setValue }) => (
                  <TextInput value={value} disabled={disabled} onChange={setValue} placeholder="e.g. warm contemporary, coastal" />
                )}
              </Field>

              <Field label="Budget range" field={info.budget} onChange={(f) => setField('budget', f)}>
                {({ value, disabled, setValue }) => (
                  <TextInput value={value} disabled={disabled} onChange={setValue} placeholder="e.g. mid–high ($$$)" />
                )}
              </Field>

              <Field label="Location" field={info.location} onChange={(f) => setField('location', f)}>
                {({ value, disabled, setValue }) => (
                  <MapboxLocationField value={value} disabled={disabled} onChange={setValue} />
                )}
              </Field>

              <Field label="Colour palette" field={info.colourPalette} onChange={(f) => setField('colourPalette', f)}>
                {({ value, disabled, setValue }) => (
                  <TextInput value={value} disabled={disabled} onChange={setValue} placeholder="e.g. sand, charcoal, brass" />
                )}
              </Field>

              <Field label="Materials to avoid" field={info.materialsToAvoid} onChange={(f) => setField('materialsToAvoid', f)}>
                {({ value, disabled, setValue }) => (
                  <TextInput value={value} disabled={disabled} onChange={setValue} placeholder="e.g. high-gloss laminate, cold greys" />
                )}
              </Field>

              <Field label="Compliance requirements" field={info.compliance} onChange={(f) => setField('compliance', f)}>
                {({ value, disabled, setValue }) => (
                  <TextInput value={value} disabled={disabled} onChange={setValue} placeholder="e.g. local building code, fire ratings" />
                )}
              </Field>

              <Field label="Supply-chain preferences" field={info.supplyChain} onChange={(f) => setField('supplyChain', f)}>
                {({ value, disabled, setValue }) => (
                  <TextInput value={value} disabled={disabled} onChange={setValue} placeholder="e.g. regional suppliers, short lead times" />
                )}
              </Field>
            </Card>

            {typeFields.length > 0 && (
              <Card className="mt-6 grid gap-6 p-6">
                <p className="text-title-sm text-muted">
                  {PROJECT_TYPE_LABELS[info.projectType]}-specific
                </p>
                {typeFields.map((def) => {
                  const f = info.typeSpecific[def.id] ?? emptyField('')
                  return (
                    <Field
                      key={def.id}
                      label={def.label}
                      hint={def.hint}
                      field={f}
                      onChange={(nf) => setTypeField(def.id, nf)}
                    >
                      {({ value, disabled, setValue }) => (
                        <TextInput
                          value={value}
                          disabled={disabled}
                          onChange={setValue}
                          placeholder={def.placeholder}
                        />
                      )}
                    </Field>
                  )
                })}
              </Card>
            )}

            <div className="mt-8 flex justify-between">
              <Button variant="secondary" onClick={() => setPhase(1)}>
                Back
              </Button>
              <Button onClick={confirm}>Create project</Button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
