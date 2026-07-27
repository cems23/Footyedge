import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default function ResetPasswordRedirect({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const acceptLang = headers().get('accept-language') ?? ''
  const lang = acceptLang.toLowerCase().startsWith('en') ? 'en' : 'es'

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') params.set(key, value)
  }
  const qs = params.toString()

  redirect(`/${lang}/auth/reset-password${qs ? `?${qs}` : ''}`)
}
