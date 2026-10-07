import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { Auth } from '../api/services'
import { errorField, errorMessage, tokens } from '../api/client'
import { useMutation } from '../app/hooks'
import { Button, ErrorNote, Field, Input, Modal } from './ui'

export default function ChangePassword({ open, onClose }) {
  const empty = { current_password: '', new_password: '', confirm: '' }
  const { register, handleSubmit, reset, setError, watch, formState } = useForm({ defaultValues: empty })
  const [show, setShow] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [save, busy] = useMutation((body) => Auth.changePassword(body), { success: 'Password changed' })
  const err = (k) => formState.errors[k]?.message

  const close = () => {
    reset(empty)
    setServerError(null)
    onClose()
  }

  const onSubmit = async ({ current_password, new_password }) => {
    setServerError(null)
    const { data, error } = await save({ current_password, new_password })
    if (data?.access_token) tokens.set({ access_token: data.access_token, refresh_token: data.refresh_token })
    if (error) {
      const f = errorField(error)
      if (f) setError(f, { message: errorMessage(error) })
      else setServerError(errorMessage(error))
      return
    }
    close()
  }

  const type = show ? 'text' : 'password'
  return (
    <Modal
      open={open}
      onClose={close}
      title="Change password"
      subtitle="Use at least 10 characters. A short sentence is easy to remember and hard to guess."
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={busy}>
            Save new password
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Current password" error={err('current_password')}>
          <Input id="pw-current" type={type} autoComplete="current-password" {...register('current_password', { required: 'Enter your current password' })} error={err('current_password')} />
        </Field>
        <Field label="New password" error={err('new_password')}>
          <Input id="pw-new" type={type} autoComplete="new-password" {...register('new_password', { required: 'Enter a new password', minLength: { value: 10, message: 'Use at least 10 characters' } })} error={err('new_password')} />
        </Field>
        <Field label="Type the new password again" error={err('confirm')}>
          <Input id="pw-confirm" type={type} autoComplete="new-password" {...register('confirm', { validate: (v) => v === watch('new_password') || 'The two passwords are different' })} error={err('confirm')} />
        </Field>
        <button type="button" onClick={() => setShow((s) => !s)} className="flex items-center gap-2 text-sm font-semibold text-altar-600">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {show ? 'Hide passwords' : 'Show passwords'}
        </button>
        <ErrorNote>{serverError}</ErrorNote>
      </form>
    </Modal>
  )
}
