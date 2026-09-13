// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ViewTransitionLike } from '@theme-switch-animation/core'
import { removeAnimationStyle } from '@theme-switch-animation/core'
import { THEME_STORAGE_KEY, ThemeAnimationType, useThemeAnimation } from './index'
import type { UseThemeAnimationOptions } from './index'

const html = () => document.documentElement

/**
 * 测试宿主：options 用 reactive 包装（模拟调用方传响应式对象/props 的场景），
 * triggerRef 挂到 button，isDark 渲染为文案。
 */
function makeHost(initial: UseThemeAnimationOptions = {}) {
  const options = reactive({ ...initial }) as UseThemeAnimationOptions
  const Host = defineComponent({
    setup() {
      const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)
      return () =>
        h(
          'button',
          { ref: triggerRef, onClick: toggleTheme, 'data-testid': 'toggle' },
          isDark.value ? '🌙' : '☀️',
        )
    },
  })
  return { Host, options }
}

/** 受控模式宿主：外部主题状态在 reactive store 里，onChange 回写（模拟 color-mode / 自管理状态） */
function makeControlledHost(onChangeSpy?: (next: boolean) => void) {
  const external = reactive({ dark: false })
  const options = reactive({
    animationType: ThemeAnimationType.LTR,
    darkClassName: 'dark',
    isDark: false,
    onChange: (next: boolean) => {
      external.dark = next
      options.isDark = next
      onChangeSpy?.(next)
    },
  }) as UseThemeAnimationOptions
  const Host = defineComponent({
    setup() {
      const { triggerRef, toggleTheme, isDark } = useThemeAnimation<HTMLButtonElement>(options)
      return () =>
        h(
          'button',
          { ref: triggerRef, onClick: toggleTheme, 'data-testid': 'toggle' },
          isDark.value ? '🌙' : '☀️',
        )
    },
  })
  return { Host, options, external }
}

/** 记录转场回调；autoRun 时同步执行（模拟浏览器尽快调用回调） */
function installFakeViewTransition(options: { autoRun?: boolean } = {}) {
  const updates: Array<() => void | Promise<unknown>> = []
  Object.defineProperty(document, 'startViewTransition', {
    configurable: true,
    writable: true,
    value: (update: () => void | Promise<unknown>): ViewTransitionLike => {
      updates.push(update)
      if (options.autoRun) void update()
      return { finished: Promise.resolve() }
    },
  })
  return { updates }
}

const getButton = () => document.querySelector('[data-testid="toggle"]') as HTMLButtonElement

/** 等待 Vue 调度器排空（onMounted / nextTick 链） */
const flush = async () => {
  await nextTick()
  await nextTick()
}

describe('useThemeAnimation（Vue composable）', () => {
  beforeEach(() => {
    localStorage.clear()
    html().className = ''
    delete (document as unknown as Record<string, unknown>).startViewTransition
  })

  afterEach(() => {
    removeAnimationStyle(document)
    document.body.innerHTML = ''
  })

  describe('初始状态读取（非受控）', () => {
    it('没有存储记录：isDark=false，不改 DOM', async () => {
      const { Host } = makeHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      expect(getButton().textContent).toBe('☀️')
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
      wrapper.unmount()
    })

    it('localStorage 为 dark：挂载后恢复 isDark=true 并补 class', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      const { Host } = makeHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      expect(getButton().textContent).toBe('🌙')
      expect(html().classList.contains('dark')).toBe(true)
      wrapper.unmount()
    })

    it('localStorage 为 light：清除残留 class', async () => {
      html().className = 'dark'
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      const { Host } = makeHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      expect(getButton().textContent).toBe('☀️')
      expect(html().classList.contains('dark')).toBe(false)
      wrapper.unmount()
    })
  })

  describe('降级路径（jsdom 无 View Transitions，即真实降级形态）', () => {
    it('点击：状态翻转、class 切换、localStorage 写入，Vue DOM 同步更新', async () => {
      const { Host } = makeHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      await getButton().click()
      await flush()
      expect(getButton().textContent).toBe('🌙')
      expect(html().classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

      await getButton().click()
      await flush()
      expect(getButton().textContent).toBe('☀️')
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
      wrapper.unmount()
    })
  })

  describe('动画路径（模拟支持 View Transitions）', () => {
    it('转场回调为 async（await nextTick 路线，§9-1）：Promise 结算前 class 与 Vue DOM 均已更新', async () => {
      const { updates } = installFakeViewTransition()
      const { Host } = makeHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      await getButton().click()

      // 回调已捕获但未执行：DOM 仍旧主题（截图前的旧状态）
      expect(updates).toHaveLength(1)
      expect(html().classList.contains('dark')).toBe(false)
      expect(getButton().textContent).toBe('☀️')

      // 浏览器执行转场回调：class 翻转 + Vue DOM 更新（nextTick）完成后 Promise 才结算
      await updates[0]!()
      expect(html().classList.contains('dark')).toBe(true)
      expect(getButton().textContent).toBe('🌙')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
      wrapper.unmount()
    })

    it.each(Object.values(ThemeAnimationType))('%s：注入对应 keyframes 样式', async (type) => {
      installFakeViewTransition({ autoRun: true })
      const { Host } = makeHost({ animationType: type, duration: 450, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' })
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      await getButton().click()
      await flush()

      const style = document.getElementById('theme-switch-animation')
      expect(style).not.toBeNull()
      const css = style!.textContent ?? ''
      expect(css).toContain(`@keyframes theme-switch-${type} {`)
      expect(css).toContain('--theme-switch-duration: 450ms;')
      expect(css).toContain('--theme-switch-easing: cubic-bezier(0.4, 0, 0.2, 1);')
      wrapper.unmount()
    })

    it('快速连点：html class 交替翻转，最终与按钮文案一致', async () => {
      const { updates } = installFakeViewTransition()
      const { Host } = makeHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      await getButton().click()
      await getButton().click()
      expect(updates).toHaveLength(2)

      await updates[0]!()
      expect(html().classList.contains('dark')).toBe(true)
      await updates[1]!()
      expect(html().classList.contains('dark')).toBe(false)
      expect(getButton().textContent).toBe('☀️')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
      wrapper.unmount()
    })
  })

  describe('受控模式（§5.2 / §5.4）', () => {
    it('isDark + onChange 同时提供：点击只调 onChange，不碰 localStorage、不自行改 class', async () => {
      installFakeViewTransition({ autoRun: true })
      const calls: boolean[] = []
      const { Host, external } = makeControlledHost((next) => calls.push(next))
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      await getButton().click()
      // 受控协议：onChange 被调用 → 外部状态翻转 →（waitForThemeSync 超时兜底或 class 变化）
      await new Promise((r) => setTimeout(r, 350))

      expect(calls).toEqual([true])
      expect(external.dark).toBe(true)
      // 外部系统未写 html class（本宿主只改自己的状态），库也不越权改
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
      wrapper.unmount()
    })

    it('外部系统写 class（受控完整链路）：协议观察到翻转后 resolve，样式注入正常', async () => {
      const { updates } = installFakeViewTransition()
      const { Host } = makeControlledHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      await getButton().click()

      // 模拟外部主题系统在 onChange 后写入 class（next-themes / color-mode 行为）
      html().classList.add('dark')
      await updates[0]!()

      expect(html().classList.contains('dark')).toBe(true)
      expect(document.getElementById('theme-switch-animation')).not.toBeNull()
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
      wrapper.unmount()
    })

    it('只提供 isDark：dev 告警，按非受控处理', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const { Host } = makeHost({ isDark: true })
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('受控模式'))

      // 非受控行为：点击走 class + localStorage
      await getButton().click()
      await flush()
      expect(html().classList.contains('dark')).toBe(true)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
      wrapper.unmount()
    })

    it('只提供 onChange：同样告警并按非受控处理', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const onChange = vi.fn()
      const { Host } = makeHost({ onChange })
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('受控模式'))

      await getButton().click()
      await flush()
      expect(onChange).not.toHaveBeenCalled()
      expect(html().classList.contains('dark')).toBe(true)
      wrapper.unmount()
    })

    it('外部系统写 data-theme 而非 class（color-mode attribute 配置）：协议命中 data-* 变化', async () => {
      installFakeViewTransition({ autoRun: true })
      const { Host, options } = makeControlledHost()
      // 覆写外部系统：以 data-theme 形式写入（color-mode attribute="data-theme" 形态）
      options.onChange = (next: boolean) => {
        options.isDark = next
        html().setAttribute('data-theme', next ? 'dark' : 'light')
      }
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      await getButton().click()
      await flush()

      expect(html().getAttribute('data-theme')).toBe('dark')
      expect(html().classList.contains('dark')).toBe(false)
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
      wrapper.unmount()
    })

    it('动态模式切换：先非受控运行，响应式补上 isDark + onChange → 行为与 isDark 来源随新模式走', async () => {
      installFakeViewTransition({ autoRun: true })
      const { Host, options } = makeHost()
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(Host, { attachTo: '#app' })
      await flush()

      // 非受控阶段：点击写 class + localStorage
      await getButton().click()
      await flush()
      expect(getButton().textContent).toBe('🌙')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

      // 响应式补全受控契约（旧版此处 mode 被快照，isDark 返回值会与真实行为脱钩）
      options.isDark = true
      options.onChange = (next) => {
        options.isDark = next
        html().classList.toggle('dark', next)
      }
      await flush()
      expect(getButton().textContent).toBe('🌙') // 受控读取 options.isDark = true

      await getButton().click() // 受控：next = false，class 由"外部系统"写入
      await flush()
      expect(html().classList.contains('dark')).toBe(false)
      expect(getButton().textContent).toBe('☀️')
      // 受控模式不碰 localStorage：仍是非受控阶段写入的 dark
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
      wrapper.unmount()
    })

    it('同一页面多个实例：任一实例切换后，所有实例的 isDark 同步（html class 事实源）', async () => {
      installFakeViewTransition({ autoRun: true })
      const { Host: HostA } = makeHost({ animationType: ThemeAnimationType.LTR })
      const { Host: HostB } = makeHost({ animationType: ThemeAnimationType.RTL })
      document.body.innerHTML = '<div id="app"></div><div id="app-b"></div>'
      const wa = mount(HostA, { attachTo: '#app' })
      const wb = mount(HostB, { attachTo: '#app-b' })
      await flush()

      const btnA = document.querySelector('[data-testid="toggle"]') as HTMLButtonElement
      const btnB = document.querySelectorAll('[data-testid="toggle"]')[1] as HTMLButtonElement

      await btnA.click()
      await flush()
      expect(btnA.textContent).toBe('🌙')
      // B 未被点击，但镜像了 html class 的翻转：不再各自为政
      expect(btnB.textContent).toBe('🌙')

      await btnB.click()
      await flush()
      expect(btnA.textContent).toBe('☀️')
      expect(btnB.textContent).toBe('☀️')
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
      wa.unmount()
      wb.unmount()
    })

    it('finished：暴露最近一次切换的结束 Promise，降级路径立即结算', async () => {
      const probes: Array<{ value: Promise<void> }> = []
      const FinishedHost = defineComponent({
        setup() {
          const res = useThemeAnimation<HTMLButtonElement>({ animationType: ThemeAnimationType.LTR })
          probes.push(res.finished)
          return () =>
            h('button', { ref: res.triggerRef, onClick: res.toggleTheme, 'data-testid': 'toggle' })
        },
      })
      document.body.innerHTML = '<div id="app"></div>'
      const wrapper = mount(FinishedHost, { attachTo: '#app' })
      await flush()

      expect(probes[0]).toBeDefined()
      // jsdom 降级：domUpdate 同步完成
      await getButton().click()
      await flush()
      await expect(probes[0]!.value).resolves.toBeUndefined()
      wrapper.unmount()
    })
  })
})
