type ToastType = 'success' | 'error' | 'info'

function getContainer(): HTMLElement {
    let el = document.getElementById('toast-container')
    if (!el) {
        el = document.createElement('div')
        el.id = 'toast-container'
        document.body.appendChild(el)
    }
    return el
}

export function toast(message: string, type: ToastType = 'info', durationMs = 3000) {
    const container = getContainer()
    const el = document.createElement('div')
    el.className = `toast toast-${type}`

    const icons: Record<ToastType, string> = {
        success: '✓',
        error: '✕',
        info: '🦔',
    }
    el.textContent = `${icons[type]}  ${message}`
    container.appendChild(el)

    setTimeout(() => {
        el.style.opacity = '0'
        el.style.transform = 'translateX(8px)'
        el.style.transition = 'opacity 0.3s, transform 0.3s'
        setTimeout(() => el.remove(), 300)
    }, durationMs)
}

export const toastSuccess = (msg: string) => toast(msg, 'success')
export const toastError = (msg: string) => toast(msg, 'error')
export const toastInfo = (msg: string) => toast(msg, 'info')
