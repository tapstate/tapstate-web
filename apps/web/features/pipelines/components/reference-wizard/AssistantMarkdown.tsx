import { code } from '@streamdown/code'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { Streamdown } from 'streamdown'

function AssistantMarkdown({ content, responding }: { content: string; responding: boolean }) {
  const { t } = useTranslation()
  const displayContent =
    /^\\\\\S.*/.test(content) && !/^`.*`$/.test(content) ? `\`${content}\`` : content
  return (
    <Streamdown
      mode="streaming"
      isAnimating={responding}
      parseIncompleteMarkdown
      skipHtml
      plugins={{ code }}
      lineNumbers={false}
      controls={{ code: { copy: true, download: false }, table: false }}
      translations={{
        copyCode: t('wizard.assistant.copyCode'),
        copied: t('wizard.assistant.copied'),
      }}
    >
      {displayContent}
    </Streamdown>
  )
}
export default memo(AssistantMarkdown)
