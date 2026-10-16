import type { Field } from '@formily/core'

import { connect, mapProps } from '@formily/react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { JsonValue } from '@/service/source-client'

import { Button } from '@/components/ui/button'

import type { SecretDraft } from './connector-formily'

interface TextFileReaderProps {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  readOnly?: boolean
  base64?: boolean
  accept?: string
  maxFileSize?: number
  fileNameField?: string
  fileName?: unknown
  fieldName?: string
  configuredSecret?: boolean
  draft?: SecretDraft
  'aria-label'?: string
  onFileNameChange?: (name: string, value: JsonValue) => void
  onSecretChange?: (name: string, draft: SecretDraft) => void
}

function TextFileReaderBase({
  value,
  onChange,
  disabled,
  readOnly,
  base64,
  accept,
  maxFileSize,
  fileNameField,
  fileName,
  fieldName,
  configuredSecret,
  draft,
  onSecretChange,
  onFileNameChange,
  'aria-label': ariaLabel,
}: TextFileReaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const originalFileName = useRef(fileName)
  const readGeneration = useRef(0)
  const [fileError, setFileError] = useState('')
  const action = draft?.action ?? 'keep'
  const waitingForFile = configuredSecret && action === 'replace' && !draft?.value
  const configured = configuredSecret && action === 'keep'
  const cleared = configuredSecret && action === 'clear'

  useEffect(
    () => () => {
      readGeneration.current += 1
    },
    [],
  )

  function updateFileName(nextValue: JsonValue) {
    if (fileNameField) onFileNameChange?.(fileNameField, nextValue)
  }

  async function readFile(file: File) {
    const generation = ++readGeneration.current
    setFileError('')
    if (maxFileSize !== undefined && file.size > maxFileSize * 1024) {
      setFileError(t('sources.fileReader.tooLarge', { size: maxFileSize }))
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    try {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('file-read'))
        reader.onabort = () => reject(new Error('file-read'))
        reader.onload = () => {
          if (typeof reader.result !== 'string') return reject(new Error('file-read'))
          if (!base64) return resolve(reader.result)
          const comma = reader.result.indexOf(',')
          if (comma < 0) return reject(new Error('file-read'))
          resolve(reader.result.slice(comma + 1))
        }
        if (base64) reader.readAsDataURL(file)
        else reader.readAsText(file)
      })
      if (generation !== readGeneration.current) return
      if (configuredSecret && fieldName)
        onSecretChange?.(fieldName, { action: 'replace', value: content })
      else onChange?.(content)
      updateFileName(file.name)
    } catch {
      if (generation === readGeneration.current) setFileError(t('sources.fileReader.readFailed'))
    } finally {
      if (generation === readGeneration.current && inputRef.current) inputRef.current.value = ''
    }
  }

  function clearFile() {
    readGeneration.current += 1
    setFileError('')
    if (configuredSecret && fieldName) {
      onSecretChange?.(fieldName, { action: 'clear', value: '' })
    } else {
      onChange?.(null)
    }
    updateFileName(null)
  }

  function keepConfiguredFile() {
    readGeneration.current += 1
    if (fieldName) onSecretChange?.(fieldName, { action: 'keep', value: '' })
    updateFileName(typeof originalFileName.current === 'string' ? originalFileName.current : null)
  }

  return (
    <div className="grid gap-2">
      {configured && (
        <span className="text-muted-foreground text-[12px]">
          {t('sources.edit.secretConfigured')}
        </span>
      )}
      {cleared && (
        <span className="text-muted-foreground text-[12px]">{t('sources.edit.secretCleared')}</span>
      )}
      {!configured &&
        !cleared &&
        ((value !== null && value !== undefined && value !== '') || Boolean(draft?.value)) &&
        !waitingForFile && (
          <span className="text-muted-foreground text-[12px]">
            {t('sources.fileReader.fileSelected')}
          </span>
        )}
      {(!configuredSecret || waitingForFile) && (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label={ariaLabel ?? t('sources.fileReader.chooseFile')}
          disabled={disabled || readOnly}
          className="border-input bg-background text-foreground file:border-border file:bg-background file:text-foreground focus-visible:ring-ring min-h-11 w-full rounded-lg border px-3 py-2 text-[13px] file:mr-3 file:min-h-7 file:rounded-lg file:border file:px-3 file:py-1.5 file:text-[12px] focus-visible:ring-2 focus-visible:outline-none"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file) void readFile(file)
          }}
        />
      )}
      {configuredSecret && !disabled && (
        <div className="flex flex-wrap gap-2">
          {cleared ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 px-4 py-2"
              onClick={keepConfiguredFile}
            >
              {t('sources.edit.secretKeep')}
            </Button>
          ) : (
            <>
              {action === 'keep' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 px-4 py-2"
                  onClick={() =>
                    fieldName && onSecretChange?.(fieldName, { action: 'replace', value: '' })
                  }
                >
                  {t('sources.fileReader.replaceFile')}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-11 px-4 py-2"
                  onClick={keepConfiguredFile}
                >
                  {t('sources.edit.secretKeep')}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-11 px-4 py-2"
                onClick={clearFile}
              >
                {t('sources.edit.secretClear')}
              </Button>
            </>
          )}
        </div>
      )}
      {!configuredSecret && value !== null && value !== undefined && value !== '' && !disabled && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 w-fit px-4 py-2"
          onClick={clearFile}
        >
          {t('common.remove')}
        </Button>
      )}
      {fileError && (
        <span className="text-destructive text-[12px]" role="alert">
          {fileError}
        </span>
      )}
    </div>
  )
}

function formilyControlProps(field: unknown, fileNameFieldValue: unknown) {
  const connectedField = field as Field | undefined
  const fileNameField = typeof fileNameFieldValue === 'string' ? fileNameFieldValue : undefined
  return {
    value: connectedField?.value,
    onChange: (value: unknown) => connectedField?.onInput(value),
    onFileNameChange: (name: string, value: JsonValue) =>
      connectedField?.form.setValuesIn(name, value),
    fileName: fileNameField ? connectedField?.form.getValuesIn(fileNameField) : undefined,
  }
}

export const TextFileReader = connect(
  TextFileReaderBase,
  mapProps((props, field) => ({ ...props, ...formilyControlProps(field, props.fileNameField) })),
)
