import type { AnyFieldApi } from '@tanstack/react-form'
import { ApiError, firstError } from '@/lib/api'
import { bnNum } from '@/lib/text'

const FALLBACK = 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'
const BANGLA = /[ঀ-৿]/

/* Laravel answers auth requests in English; these are the messages the auth endpoints can send back. */
const MESSAGES: [RegExp, string][] = [
  [/credentials do not match/i, 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।'],
  [/email has already been taken/i, 'এই ইমেইল দিয়ে আগেই একটি অ্যাকাউন্ট খোলা হয়েছে।'],
  [/reset token is invalid|can't find a user/i, 'রিসেট লিংকটি সঠিক নয় বা মেয়াদ শেষ হয়ে গেছে। নতুন লিংক চেয়ে নিন।'],
  [/wait before retrying/i, 'একটু আগেই লিংক পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'],
  [/confirmation does not match/i, 'দুটি পাসওয়ার্ড মিলছে না।'],
  [/at least 8 characters/i, 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।'],
  [/at least one letter/i, 'পাসওয়ার্ডে অন্তত একটি অক্ষর দিন।'],
  [/at least one number/i, 'পাসওয়ার্ডে অন্তত একটি সংখ্যা দিন।'],
  [/data leak/i, 'এই পাসওয়ার্ডটি ফাঁস হওয়া পাসওয়ার্ডের তালিকায় আছে। অন্য একটি পাসওয়ার্ড দিন।'],
  [/valid email/i, 'সঠিক ইমেইল ঠিকানা দিন।'],
  [/must not be greater than/i, 'লেখাটি অনেক লম্বা হয়ে গেছে।'],
  [/is required/i, 'সব ঘর পূরণ করুন।'],
]

/** A Bangla message for a failed auth request, for showing in a toast. */
export function authError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 419) return 'সেশনের মেয়াদ শেষ হয়ে গেছে। পেজটি রিলোড করে আবার চেষ্টা করুন।'
    if (error.status >= 500) return 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
    const message = firstError(error)
    if (BANGLA.test(message)) return message
    if (error.status === 429) {
      const seconds = message.match(/(\d+) seconds?/)?.[1]
      return seconds ? `অনেকবার চেষ্টা করা হয়েছে। ${bnNum(seconds)} সেকেন্ড পর আবার চেষ্টা করুন।` : 'অনেকবার চেষ্টা করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
    }
    return MESSAGES.find(([pattern]) => pattern.test(message))?.[1] ?? FALLBACK
  }
  // fetch rejects with a TypeError when the request never reaches the server
  if (error instanceof TypeError) return 'সার্ভারের সাথে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।'
  return FALLBACK
}

/* Field validators; each returns a Bangla message or undefined. */

export const required = (message: string) => ({ value }: { value: string }) => (value.trim() ? undefined : message)

export function validEmail({ value }: { value: string }) {
  if (!value.trim()) return 'ইমেইল দিন'
  if (!/^\S+@\S+\.\S+$/.test(value.trim())) return 'সঠিক ইমেইল ঠিকানা দিন'
}

export function newPassword({ value }: { value: string }) {
  if (!value) return 'পাসওয়ার্ড দিন'
  if (value.length < 8) return 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে'
  if (!/\p{L}/u.test(value)) return 'পাসওয়ার্ডে অন্তত একটি অক্ষর দিন'
  if (!/\d/.test(value)) return 'পাসওয়ার্ডে অন্তত একটি সংখ্যা দিন'
}

export function matchesPassword({ value, fieldApi }: { value: string; fieldApi: AnyFieldApi }) {
  if (!value) return 'পাসওয়ার্ডটি আবার লিখুন'
  if (value !== fieldApi.form.getFieldValue('password')) return 'দুটি পাসওয়ার্ড মিলছে না'
}
