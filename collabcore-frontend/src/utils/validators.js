// Email validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
export const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

// URL validation
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Validate required fields
export const validateRequired = (value, fieldName = 'Field') => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return `${fieldName} is required`;
  }
  return null;
};

// Validate email with message
export const validateEmail = (email) => {
  const required = validateRequired(email, 'Email');
  if (required) return required;
  
  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
};

// Validate password with message
export const validatePassword = (password) => {
  const required = validateRequired(password, 'Password');
  if (required) return required;
  
  if (!isValidPassword(password)) {
    return 'Password must be at least 8 characters with uppercase, lowercase, and number';
  }
  return null;
};

// Validate confirm password
export const validateConfirmPassword = (password, confirmPassword) => {
  const required = validateRequired(confirmPassword, 'Confirm Password');
  if (required) return required;
  
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  return null;
};

// Validate form data
export const validateForm = (data, rules) => {
  const errors = {};
  
  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      const error = validator(data[field], data);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

