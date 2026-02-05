import { supabase } from '../lib/supabase';  
/**  
 * 密码强度验证  
 */  
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {  
  const errors: string[] = [];  
  if (password.length < 8) {  
    errors.push('密码至少需要 8 个字符');  
  }  
  if (!/[A-Z]/.test(password)) {  
    errors.push('密码必须包含至少一个大写字母');  
  }  
  if (!/[a-z]/.test(password)) {  
    errors.push('密码必须包含至少一个小写字母');  
  }  
  if (!/[0-9]/.test(password)) {  
    errors.push('密码必须包含至少一个数字');  
  }  
  if (!/[!@#$%^&*]/.test(password)) {  
    errors.push('密码必须包含至少一个特殊字符 (!@#$%^&*)');  
  }  
  return {  
    valid: errors.length === 0,  
    errors  
  };  
};  
/**  
 * 邮箱验证  
 */  
export const validateEmail = (email: string): boolean => {  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;  
  return emailRegex.test(email);  
};  
/**  
 * 安全的注册流程  
 */  
export const registerUser = async (email: string, password: string) => {  
  // 验证邮箱格式  
  if (!validateEmail(email)) {  
    throw new Error('请输入有效的邮箱地址');  
  }  
  // 验证密码强度  
  const passwordValidation = validatePasswordStrength(password);  
  if (!passwordValidation.valid) {  
    throw new Error(passwordValidation.errors.join('; '));  
  }  
  // 调用 Supabase 注册  
  const { data, error } = await supabase.auth.signUp({  
    email,  
    password,  
    options: {  
      emailRedirectTo: `${window.location.origin}/auth/callback`,  
    }  
  });  
  if (error) {  
    throw new Error(error.message);  
  }  
  return data;  
};  
/**  
 * 安全的登录流程  
 */  
export const loginUser = async (email: string, password: string) => {  
  if (!validateEmail(email)) {  
    throw new Error('请输入有效的邮箱地址');  
  }  
  const { data, error } = await supabase.auth.signInWithPassword({  
    email,  
    password  
  });  
  if (error) {  
    throw new Error(error.message);  
  }  
  return data;  
};  
/**  
 * 登出  
 */  
export const logoutUser = async () => {  
  const { error } = await supabase.auth.signOut();  
  if (error) {  
    throw new Error(error.message);  
  }  
};  
