/**
 * Input validation and sanitization utilities for auth forms.
 * These validators prevent common attack vectors like SQL injection via input,
 * XSS through unsanitized user input, and submission of malformed credentials.
 */

/**
 * Validates email format using RFC 5322 compliant regex pattern.
 * @param email - The email address to validate
 * @returns true if valid, false otherwise with error message
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' }
  }

  const trimmedEmail = email.trim()
  if (trimmedEmail === '') {
    return { isValid: false, error: 'Email cannot be empty' }
  }

  // RFC 5322 simplified pattern for common email formats
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, error: 'Please enter a valid email address' }
  }

  return { isValid: true }
}

/**
 * Validates password strength and provides specific feedback for unmet rules.
 * @param password - The password to validate
 * @returns Object containing validation status and array of unmet rules
 */
export function validatePassword(password: string): {
  isValid: boolean
  errors?: string[]
} {
  const errors: string[] = []

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required'] }
  }

  // Minimum 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  // At least one special character
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*())')
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Validates user name for signup form.
 * @param name - The name to validate
 * @returns Object containing validation status and error message
 */
export function validateName(name: string): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' }
  }

  const trimmedName = name.trim()
  if (trimmedName === '') {
    return { isValid: false, error: 'Name cannot be empty' }
  }

  // Maximum 50 characters
  if (trimmedName.length > 50) {
    return { isValid: false, error: 'Name must not exceed 50 characters' }
  }

  // No special characters allowed (letters, numbers, spaces only)
  const nameRegex = /^[a-zA-Z0-9\s]+$/
  if (!nameRegex.test(trimmedName)) {
    return { isValid: false, error: 'Name can only contain letters, numbers, and spaces' }
  }

  return { isValid: true }
}

/**
 * Sanitizes user input to prevent XSS and injection attacks.
 * Removes potentially dangerous characters while preserving valid text.
 * @param value - The input string to sanitize
 * @returns Sanitized string with whitespace trimmed and dangerous chars removed
 */
export function sanitizeInput(value: string): string {
  if (typeof value !== 'string') {
    return ''
  }

  // Trim leading/trailing whitespace
  let sanitized = value.trim()

  // Remove potential XSS vectors while preserving normal text
  // This is a defense-in-depth measure - we still sanitize server responses too
  sanitized = sanitized.replace(/<[^>]*>/g, '') // Remove HTML tags
  sanitized = sanitized.replace(/\[/g, '') // Remove brackets
  sanitized = sanitized.replace(/\]/g, '') // Remove closing brackets

  return sanitized
}

/**
 * Combined validation for signup form - validates all required fields at once.
 * @param email - Email address from form
 * @param password - Password from form
 * @param name - Full name from form
 * @returns Object with overall validity and specific error messages per field
 */
export function validateSignupForm({ email, password, name }: { email: string; password: string; name: string }) {
  const emailValidation = validateEmail(email)
  const passwordValidation = validatePassword(password)
  const nameValidation = validateName(name)

  // Combine all errors into a single result object for the form UI
  if (emailValidation.isValid && passwordValidation.isValid && nameValidation.isValid) {
    return { isValid: true, errors: [] }
  }

  const errors: string[] = []

  if (!emailValidation.isValid) {
    errors.push(emailValidation.error!)
  }

  if (!passwordValidation.isValid) {
    errors.push(...(passwordValidation.errors!))
  }

  if (!nameValidation.isValid) {
    errors.push(nameValidation.error!)
  }

  return { isValid: false, errors }
}