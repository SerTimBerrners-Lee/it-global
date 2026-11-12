/** @typedef {{value: string, type: 'phone' | 'email'}} Contact */

/** @param {unknown} input @returns {Contact | null} */
export function parseContact(input) {
  if (typeof input !== "string" || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(input)) return null;

  const value = input.trim();

  if (value.includes("@")) {
    const parts = value.split("@");
    const local = parts[0];
    const domain = parts[1];

    if (parts.length !== 2 || value.length > 254 || local.length > 64
      || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)
      || local.startsWith(".") || local.endsWith(".") || local.includes("..")
      || !domain || !domain.includes(".")
      || !domain.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))) return null;

    return { value, type: "email" };
  }

  const digits = value.replace(/\D/g, "");

  if (value.length > 30 || !/^\+?[0-9 ()-]+$/.test(value) || digits.length < 7 || digits.length > 15) return null;

  return { value, type: "phone" };
}
