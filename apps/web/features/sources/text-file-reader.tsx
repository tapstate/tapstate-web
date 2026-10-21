import type { Field } from '@formily/core'

import { connect, mapProps } from '@formily/react'
import { FileText, Upload, X } from 'lucide-react'
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
  const [fileNameOverride, setFileNameOverride] = useState<string | null | undefined>()
  const action = draft?.action ?? 'keep'
  const configured = configuredSecret && action === 'keep'
  const cleared = configuredSecret && action === 'clear'
  const hasFileValue =
    (value !== null && value !== undefined && value !== '') || Boolean(draft?.value)
  const hasSelectedFile = configuredSecret ? configured || Boolean(draft?.value) : hasFileValue
  const fieldFileName = typeof fileName === 'string' && fileName.trim() ? fileName : undefined
  const selectedFileName = fileNameOverride !== undefined ? fileNameOverride : fieldFileName
  const fileLabel =
    selectedFileName ??
    (configured ? t('sources.edit.secretConfigured') : t('sources.fileReader.filenameUnavailable'))

  useEffect(() => {
    setFileNameOverride(undefined)
    if (action === 'keep' && fileName !== undefined) originalFileName.current = fileName
  }, [action, fileName])

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
      setFileNameOverride(file.name)
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
    setFileNameOverride(null)
    if (configuredSecret && fieldName) {
      onSecretChange?.(fieldName, { action: 'clear', value: '' })
    } else {
      onChange?.(null)
    }
    updateFileName(null)
  }

  function keepConfiguredFile() {
    readGeneration.current += 1
    setFileNameOverride(
      typeof originalFileName.current === 'string' ? originalFileName.current : null,
    )
    if (fieldName) onSecretChange?.(fieldName, { action: 'keep', value: '' })
    updateFileName(typeof originalFileName.current === 'string' ? originalFileName.current : null)
  }

  return (
    <div className="grid gap-2">
      {configured && (
        <span className="sr-only" role="status">
          {t('sources.edit.secretConfigured')}
        </span>
      )}
      {cleared && (
        <span className="text-muted-foreground text-[12px]">{t('sources.edit.secretCleared')}</span>
      )}
      {hasSelectedFile && (
        <span className="sr-only" role="status" aria-live="polite">
          {t('sources.fileReader.fileSelected')}: {fileLabel}
        </span>
      )}
      {!cleared && (
        <div className="border-input bg-background flex min-h-11 min-w-0 flex-wrap items-center gap-3 rounded-lg border p-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            aria-label={ariaLabel ?? t('sources.fileReader.chooseFile')}
            tabIndex={-1}
            disabled={disabled || readOnly}
            className="sr-only"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              if (file) void readFile(file)
            }}
          />
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <span
              className={`min-w-0 flex-1 text-[13px] [overflow-wrap:anywhere] break-words ${
                hasSelectedFile ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {hasSelectedFile ? fileLabel : t('sources.fileReader.noFileSelected')}
            </span>
          </div>
          <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1 sm:w-auto">
            {(!configuredSecret || action === 'replace') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11 px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] duration-150"
                disabled={disabled || readOnly}
                onClick={() => inputRef.current?.click()}
              >
                <Upload className="size-4" aria-hidden="true" />
                {hasSelectedFile
                  ? t('sources.fileReader.replaceFile')
                  : t('sources.fileReader.chooseFile')}
              </Button>
            )}
            {!configuredSecret && hasSelectedFile && !disabled && !readOnly && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive min-h-11 px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] duration-150"
                onClick={clearFile}
              >
                <X className="size-4" aria-hidden="true" />
                {t('common.remove')}
              </Button>
            )}
          </div>
        </div>
      )}
      {configuredSecret && !disabled && !readOnly && (
        <div className="flex flex-wrap gap-2">
          {cleared ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="min-h-11 px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] duration-150"
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
                  className="min-h-11 px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] duration-150"
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
                  className="min-h-11 px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] duration-150"
                  onClick={keepConfiguredFile}
                >
                  {t('sources.edit.secretKeep')}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive min-h-11 px-4 py-2 transition-[color,background-color,border-color,box-shadow,transform] duration-150"
                onClick={clearFile}
              >
                {t('sources.edit.secretClear')}
              </Button>
            </>
          )}
        </div>
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
