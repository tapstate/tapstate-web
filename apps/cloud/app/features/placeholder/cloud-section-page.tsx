import { useTranslation } from 'react-i18next'

import type { CloudSectionId } from '../cloud-data'

const pageKeys: Record<CloudSectionId, string> = {
  overview: 'sections.overview',
  clusters: 'sections.clusters',
  organizations: 'sections.organizations',
  billing: 'sections.billing',
  settings: 'sections.settings',
}

export function CloudSectionPage({ section }: { section: CloudSectionId }) {
  const { t } = useTranslation()
  const key = pageKeys[section]

  return (
    <section className="section-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">{t('app.workspace')}</p>
          <h1>{t(`${key}.title`)}</h1>
          <p>{t(`${key}.description`)}</p>
        </div>
        <span className="status-pill">{t('app.preview')}</span>
      </header>
      <div className="section-placeholder">
        <div className="placeholder-mark" aria-hidden="true">
          T
        </div>
        <h2>{t('sections.notConnectedTitle')}</h2>
        <p>{t('sections.notConnectedDescription')}</p>
      </div>
    </section>
  )
}
