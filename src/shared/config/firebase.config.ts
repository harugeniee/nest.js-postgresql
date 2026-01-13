/**
 * Normalize Firebase private key to ensure proper PEM format
 * Handles both literal newlines and \n escape sequences
 * Firebase requires PEM keys to have actual newline characters, not \n strings
 */
function normalizePrivateKey(privateKey?: string): string | undefined {
  if (!privateKey) {
    return undefined;
  }

  // Step 1: Replace literal \n escape sequences with actual newlines
  // This handles cases where the key is stored as "-----BEGIN...\\nMII..."
  let normalized = privateKey.replace(/\\n/g, '\n');

  // Step 2: If the key doesn't have proper PEM structure, try to fix it
  // Check if BEGIN and END markers exist
  const hasBegin = normalized.includes('-----BEGIN');
  const hasEnd = normalized.includes('-----END');

  if (!hasBegin || !hasEnd) {
    // Key is malformed, return as-is and let Firebase SDK handle the error
    return privateKey;
  }

  // Step 3: Ensure proper line breaks around PEM boundaries
  // Remove any spaces/newlines right after BEGIN marker
  normalized = normalized.replace(/(-----BEGIN[^-]+-----)\s*/, '$1\n');
  // Remove any spaces/newlines right before END marker
  normalized = normalized.replace(/\s*(-----END[^-]+-----)/, '\n$1');

  // Step 4: Clean up the key body (between BEGIN and END)
  // Remove any extra whitespace but preserve the base64 content
  // The key body should be base64 encoded, typically 64 characters per line
  const beginMatch = normalized.match(/(-----BEGIN[^-]+-----)\n?/);
  const endMatch = normalized.match(/\n?(-----END[^-]+-----)/);

  if (beginMatch && endMatch) {
    const beginMarker = beginMatch[1];
    const endMarker = endMatch[1];
    // Extract the key body (everything between markers)
    const keyBody = normalized
      .replace(beginMarker, '')
      .replace(endMarker, '')
      .trim();

    // Reconstruct with proper formatting
    // Keep the key body as-is (it might have newlines already)
    normalized = `${beginMarker}\n${keyBody}\n${endMarker}`;
  }

  // Step 5: Final cleanup - ensure no trailing/leading whitespace
  return normalized.trim();
}

export const firebaseConfig = () => ({
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  clientId: process.env.FIREBASE_CLIENT_ID,
  clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
});
