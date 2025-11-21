import { useEffect, useState } from 'react'

interface SettingsFormProps {
  value: Record<string, unknown>
  onSave: (next: Record<string, unknown>) => Promise<void>
  saving: boolean
}

export function SettingsForm({
  value,
  onSave,
  saving,
}: SettingsFormProps) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(JSON.stringify(value, null, 2))
  }, [value])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const parsed = JSON.parse(draft)
      await onSave(parsed)
      setError(null)
    } catch (err) {
      setError('Settings must be valid JSON.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="settings">Personal Settings (JSON)</label>
        <textarea
          id="settings"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={8}
        />
      </div>
      {error ? <div style={{ color: '#dc2626', marginBottom: '0.5rem' }}>{error}</div> : null}
      <button type="submit" className="button" disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </form>
  )
}

