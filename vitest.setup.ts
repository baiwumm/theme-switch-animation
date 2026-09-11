// React 的 act() 需要显式声明测试环境（@testing-library/react 依赖此标志消除 act 告警）
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
