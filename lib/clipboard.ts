export async function copyToClipboard(text: string): Promise<boolean> {
  // Preferred path: async Clipboard API (requires secure context + permission)
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Fall through to the legacy fallback below (e.g. blocked by iframe policy)
    }
  }

  // Fallback: hidden textarea + execCommand('copy'), works when Clipboard API
  // is blocked by a permissions policy (such as a sandboxed preview iframe).
  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-9999px'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
