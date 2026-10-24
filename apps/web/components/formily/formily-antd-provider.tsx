import type { PropsWithChildren } from 'react'

import { ConfigProvider, type ThemeConfig } from 'antd'

export const formilyAntdPrefixCls = 'tap'

export const formilyAntdTheme: ThemeConfig = {
  token: {
    borderRadius: 8,
    controlOutline: 'color-mix(in srgb, var(--ts-border-focus) 20%, transparent)',
    controlOutlineWidth: 3,
    fontFamily: 'inherit',
    colorBgContainer: 'var(--ts-bg-surface)',
    colorBgContainerDisabled: 'var(--ts-input-disabled)',
    colorBgElevated: 'var(--ts-bg-surface)',
    colorBgLayout: 'var(--ts-bg-canvas)',
    colorBgTextActive: 'var(--ts-bg-hover)',
    colorBgTextHover: 'var(--ts-bg-hover)',
    colorBorder: 'transparent',
    colorBorderSecondary: 'var(--ts-border-subtle)',
    colorError: 'var(--ts-state-danger-text)',
    colorErrorBorder: 'var(--ts-state-danger-border)',
    colorErrorBorderHover: 'var(--ts-state-danger-text)',
    colorErrorOutline: 'color-mix(in srgb, var(--ts-state-danger-text) 20%, transparent)',
    colorErrorText: 'var(--ts-state-danger-text)',
    colorFillAlter: 'var(--ts-bg-subtle)',
    colorFillContent: 'var(--ts-bg-subtle)',
    colorFillContentHover: 'var(--ts-bg-hover)',
    colorPrimary: 'var(--ts-brand-primary)',
    colorPrimaryActive: 'var(--ts-brand-pressed)',
    colorPrimaryBg: 'var(--ts-bg-selected)',
    colorPrimaryBgHover: 'var(--ts-bg-hover)',
    colorPrimaryBorder: 'var(--ts-brand-primary)',
    colorPrimaryBorderHover: 'var(--ts-brand-hover)',
    colorPrimaryHover: 'var(--ts-brand-hover)',
    colorPrimaryText: 'var(--ts-brand-primary)',
    colorPrimaryTextActive: 'var(--ts-brand-pressed)',
    colorPrimaryTextHover: 'var(--ts-brand-hover)',
    colorSplit: 'var(--ts-border-subtle)',
    colorText: 'var(--ts-text-primary)',
    colorTextLightSolid: 'var(--ts-text-inverse)',
    colorTextPlaceholder: 'var(--ts-text-placeholder)',
    colorTextSecondary: 'var(--ts-text-secondary)',
    colorTextTertiary: 'var(--ts-text-tertiary)',
    colorWhite: 'var(--ts-text-inverse)',
    controlItemBgActive: 'var(--ts-bg-selected)',
    controlItemBgActiveHover: 'var(--ts-bg-hover)',
    controlItemBgHover: 'var(--ts-bg-hover)',
  },
  components: {
    Input: {
      activeBorderColor: 'var(--ts-border-focus)',
      hoverBorderColor: 'var(--ts-input-border)',
    },
    InputNumber: {
      activeBorderColor: 'var(--ts-border-focus)',
      hoverBorderColor: 'var(--ts-input-border)',
    },
    Select: {
      activeBorderColor: 'var(--ts-border-focus)',
      activeOutlineColor: 'color-mix(in srgb, var(--ts-border-focus) 20%, transparent)',
      hoverBorderColor: 'var(--ts-input-border)',
      optionActiveBg: 'var(--ts-bg-hover)',
      optionSelectedBg: 'var(--ts-bg-selected)',
      optionSelectedColor: 'var(--ts-text-primary)',
    },
  },
}

export const formilySharedUITheme: ThemeConfig = {
  token: {
    ...formilyAntdTheme.token,
    controlOutline: 'var(--color-state-accent-solid)',
    controlOutlineWidth: 2,
    colorBgContainer: 'var(--color-components-input-bg-normal)',
    colorBgContainerDisabled: 'var(--color-components-input-bg-disabled)',
    colorBgElevated: 'var(--color-background-default)',
    colorBgLayout: 'var(--color-background-default)',
    colorBgTextActive: 'var(--color-state-base-active)',
    colorBgTextHover: 'var(--color-state-base-hover)',
    colorBorderSecondary: 'var(--color-divider-subtle)',
    colorError: 'var(--color-text-destructive)',
    colorErrorBorder: 'var(--color-components-input-border-destructive)',
    colorErrorBorderHover: 'var(--color-text-destructive)',
    colorErrorOutline: 'color-mix(in srgb, var(--color-text-destructive) 20%, transparent)',
    colorErrorText: 'var(--color-text-destructive)',
    colorFillAlter: 'var(--color-components-input-bg-normal)',
    colorFillContent: 'var(--color-components-input-bg-normal)',
    colorFillContentHover: 'var(--color-components-input-bg-hover)',
    colorPrimary: 'var(--color-text-accent)',
    colorPrimaryActive: 'var(--color-text-accent)',
    colorPrimaryBg:
      'color-mix(in srgb, var(--color-text-accent) 10%, var(--color-background-default))',
    colorPrimaryBgHover:
      'color-mix(in srgb, var(--color-text-accent) 10%, var(--color-background-default))',
    colorPrimaryBorder: 'var(--color-text-accent)',
    colorPrimaryBorderHover: 'var(--color-text-accent)',
    colorPrimaryHover: 'var(--color-text-accent)',
    colorPrimaryText: 'var(--color-text-accent)',
    colorPrimaryTextActive: 'var(--color-text-accent)',
    colorPrimaryTextHover: 'var(--color-text-accent)',
    colorSplit: 'var(--color-divider-subtle)',
    colorText: 'var(--color-text-primary)',
    colorTextLightSolid: 'var(--color-text-primary-on-surface)',
    colorTextPlaceholder: 'var(--color-components-input-text-placeholder)',
    colorTextSecondary: 'var(--color-text-secondary)',
    colorTextTertiary: 'var(--color-text-tertiary)',
    colorWhite: 'var(--color-background-default)',
    controlItemBgActive:
      'color-mix(in srgb, var(--color-text-accent) 10%, var(--color-background-default))',
    controlItemBgActiveHover:
      'color-mix(in srgb, var(--color-text-accent) 10%, var(--color-background-default))',
    controlItemBgHover: 'var(--color-state-base-hover)',
  },
  components: {
    Input: {
      activeBorderColor: 'transparent',
      activeShadow: '0 0 0 2px var(--color-state-accent-solid)',
      hoverBorderColor: 'var(--color-components-input-border-hover)',
    },
    InputNumber: {
      activeBorderColor: 'transparent',
      activeShadow: '0 0 0 2px var(--color-state-accent-solid)',
      hoverBorderColor: 'var(--color-components-input-border-hover)',
    },
    Select: {
      activeBorderColor: 'transparent',
      activeOutlineColor: 'transparent',
      hoverBorderColor: 'var(--color-components-input-border-hover)',
      optionActiveBg: 'var(--color-state-base-hover)',
      optionSelectedBg:
        'color-mix(in srgb, var(--color-text-accent) 10%, var(--color-background-default))',
      optionSelectedColor: 'var(--color-text-primary)',
    },
  },
}

/** Keeps schema layout on Formily while mapping its compatibility styles to shared UI tokens. */
export function FormilyAntdProvider({
  children,
  theme = formilyAntdTheme,
}: PropsWithChildren<{ theme?: ThemeConfig }>) {
  return (
    <ConfigProvider prefixCls={formilyAntdPrefixCls} theme={theme}>
      {children}
    </ConfigProvider>
  )
}
