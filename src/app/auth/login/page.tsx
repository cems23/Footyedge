import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default function LoginRedirect() {
  const acceptLang = headers().get('accept-language') ?? ''
  const lang = acceptLang.toLowerCase().startsWith('en') ? 'en' : 'es'
  redirect(`/${lang}/auth/login`)
}
