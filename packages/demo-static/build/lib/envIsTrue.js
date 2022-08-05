export const envIsTrue = envVar => {
  if (!envVar) return false;
  return envVar === 'true' || envVar === '1' || envVar === 'yes' || envVar === 'on';
};