import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

export async function generateQrDataUrl(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'H', // High error correction so logos/badges can be centered safely
    type: 'image/png',
    margin: options.margin ?? 1,
    width: options.width ?? 400,
    color: {
      dark: options.color?.dark ?? '#1e293b',
      light: options.color?.light ?? '#ffffff',
    },
  };

  try {
    return await QRCode.toDataURL(text, defaultOptions);
  } catch (err) {
    console.error('Error generating QR code:', err);
    return '';
  }
}

export async function generateQrSvg(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToStringOptions = {
    errorCorrectionLevel: 'H',
    type: 'svg',
    margin: options.margin ?? 1,
    width: options.width ?? 400,
    color: {
      dark: options.color?.dark ?? '#1e293b',
      light: options.color?.light ?? '#ffffff',
    },
  };

  try {
    return await QRCode.toString(text, defaultOptions);
  } catch (err) {
    console.error('Error generating QR SVG:', err);
    return '';
  }
}
