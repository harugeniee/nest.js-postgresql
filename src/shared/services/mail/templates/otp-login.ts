/**
 * OTP Login Email Template
 * Template for sending OTP codes for login authentication
 */

interface OtpLoginTemplateData {
  /** The 6-digit OTP code */
  otpCode: string;
  /** Request ID for tracking */
  requestId: string;
  /** Application name */
  appName?: string;
  /** Application URL */
  appUrl?: string;
  /** Support email address */
  supportEmail?: string;
  /** Company name */
  companyName?: string;
  /** OTP expiration time in minutes */
  expiresInMinutes?: number;
}

/**
 * Generate OTP login email template
 * @param data - Template data including OTP code and other variables
 * @returns HTML email content
 */
export function otpLoginTemplate(data: OtpLoginTemplateData): string {
  const {
    otpCode,
    requestId,
    appName = 'NestJS App',
    appUrl = 'http://localhost:3000',
    supportEmail = 'support@example.com',
    companyName = 'Your Company',
    expiresInMinutes = 5,
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Code - ${appName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 28px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 30px;
        }
        .otp-container {
            background-color: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
            padding: 15px;
            background-color: #ffffff;
            border-radius: 6px;
            border: 1px solid #e5e7eb;
            display: inline-block;
            min-width: 200px;
        }
        .otp-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 10px;
        }
        .expiry-notice {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        .expiry-text {
            color: #92400e;
            font-size: 14px;
            margin: 0;
        }
        .security-notice {
            background-color: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
        }
        .security-title {
            color: #0c4a6e;
            font-weight: 600;
            font-size: 14px;
            margin: 0 0 8px 0;
        }
        .security-text {
            color: #0c4a6e;
            font-size: 13px;
            margin: 0;
            line-height: 1.5;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #2563eb;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        .request-id {
            font-size: 12px;
            color: #9ca3af;
            margin-top: 10px;
        }
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
            .otp-code {
                font-size: 24px;
                letter-spacing: 4px;
                min-width: 150px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">${appName}</div>
            <h1 class="title">Your Login Code</h1>
            <p class="subtitle">Use this code to complete your login</p>
        </div>

        <div class="otp-container">
            <div class="otp-label">Your verification code is:</div>
            <div class="otp-code">${otpCode}</div>
        </div>

        <div class="expiry-notice">
            <p class="expiry-text">
                ⏰ This code will expire in ${expiresInMinutes} minutes for security reasons.
            </p>
        </div>

        <div class="security-notice">
            <p class="security-title">🔒 Security Information</p>
            <p class="security-text">
                • Never share this code with anyone<br>
                • We will never ask for this code via phone or email<br>
                • If you didn't request this code, please ignore this email<br>
                • This code can only be used once
            </p>
        </div>

        <div class="footer">
            <p>
                If you have any questions, please contact us at 
                <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
            <p>
                Visit our website: <a href="${appUrl}">${appUrl}</a>
            </p>
            <div class="request-id">
                Request ID: ${requestId}
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}
