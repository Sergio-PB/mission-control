import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { FilePathLink, __resetFileExistsCache } from './file-path-link'

const apiFetchMock = vi.fn()

vi.mock('@/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}))

describe('FilePathLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    __resetFileExistsCache()
  })

  it('renders a normal link while the existence probe is in flight', () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}))
    render(<FilePathLink path="docs/plans/real.md" href="/memory?path=docs%2Fplans%2Freal.md" />)
    const link = screen.getByRole('link', { name: 'docs/plans/real.md' })
    expect(link).toHaveAttribute('href', '/memory?path=docs%2Fplans%2Freal.md')
    expect(link).not.toHaveAttribute('data-file-missing')
  })

  it('renders a normal link when the file exists', async () => {
    apiFetchMock.mockResolvedValue({ exists: true })
    render(<FilePathLink path="docs/plans/real.md" href="/memory?path=docs%2Fplans%2Freal.md" />)
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1))
    const link = screen.getByRole('link', { name: 'docs/plans/real.md' })
    await waitFor(() => expect(link).not.toHaveAttribute('data-file-missing'))
  })

  it('marks the link as missing when the file does not exist in the workspace', async () => {
    apiFetchMock.mockResolvedValue({ exists: false })
    render(
      <FilePathLink
        path="products/qr_code_resolvers/fallback.py"
        href="/memory?path=products%2Fqr_code_resolvers%2Ffallback.py"
      />,
    )
    const link = await screen.findByRole('link', { name: /fallback\.py/ })
    await waitFor(() => expect(link).toHaveAttribute('data-file-missing', 'true'))
    expect(link).toHaveAttribute('title', expect.stringContaining('not found'))
  })

  it('caches existence results per path', async () => {
    apiFetchMock.mockResolvedValue({ exists: false })
    render(
      <>
        <FilePathLink path="a/b/missing.py" href="/memory?path=a%2Fb%2Fmissing.py" />
        <FilePathLink path="a/b/missing.py" href="/memory?path=a%2Fb%2Fmissing.py" />
      </>,
    )
    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links.every((l) => l.getAttribute('data-file-missing') === 'true')).toBe(true)
    })
    expect(apiFetchMock).toHaveBeenCalledTimes(1)
  })

  it('leaves the link unmarked when the probe fails', async () => {
    apiFetchMock.mockRejectedValue(new Error('boom'))
    render(<FilePathLink path="docs/plans/real.md" href="/memory?path=docs%2Fplans%2Freal.md" />)
    const link = screen.getByRole('link', { name: 'docs/plans/real.md' })
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1))
    expect(link).not.toHaveAttribute('data-file-missing')
  })
})
