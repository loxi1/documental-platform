const LOCAL_GATEWAY_API_URL = "http://localhost:3000/api/v1";

function cleanUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function assertProductionUrl(value: string, variableName: string) {
  if (process.env.NODE_ENV !== "production") return;

  if (!value) {
    throw new Error(`${variableName} es obligatorio en producción.`);
  }

  if (value.includes("localhost") || value.includes("127.0.0.1") || value.includes("192.168.")) {
    throw new Error(`${variableName} no puede apuntar a una URL local en producción: ${value}`);
  }

  if (!value.startsWith("https://")) {
    throw new Error(`${variableName} debe usar HTTPS en producción: ${value}`);
  }
}

export function getPublicApiUrl() {
  const value = cleanUrl(process.env.NEXT_PUBLIC_API_URL ?? LOCAL_GATEWAY_API_URL);
  assertProductionUrl(value, "NEXT_PUBLIC_API_URL");
  return value;
}

export function getPublicAuthApiUrl() {
  const value = cleanUrl(
    process.env.NEXT_PUBLIC_AUTH_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? LOCAL_GATEWAY_API_URL,
  );
  assertProductionUrl(value, "NEXT_PUBLIC_AUTH_API_URL/NEXT_PUBLIC_API_URL");
  return value;
}
