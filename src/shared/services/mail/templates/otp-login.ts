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
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');
        
        body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #2d3748;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
        }
        
        .container::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            position: relative;
            z-index: 2;
        }
        
        .logo {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(45deg, #667eea, #764ba2, #f093fb);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 15px;
            animation: gradientShift 3s ease infinite;
        }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        .title {
            font-size: 32px;
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 15px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .subtitle {
            font-size: 18px;
            color: #4a5568;
            margin-bottom: 30px;
            font-weight: 300;
        }
        
        .otp-container {
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            border: 3px solid transparent;
            background-clip: padding-box;
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            margin: 40px 0;
            position: relative;
            box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .otp-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, #667eea, #764ba2, #f093fb, #f5576c);
            border-radius: 20px;
            padding: 3px;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
        }
        
        .otp-code {
            font-size: 36px;
            font-weight: 700;
            color: #2d3748;
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
            margin: 20px 0;
            padding: 25px;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 15px;
            border: 2px solid #e2e8f0;
            display: inline-block;
            min-width: 250px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 2;
            animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }
        
        .otp-label {
            font-size: 16px;
            color: #4a5568;
            margin-bottom: 15px;
            font-weight: 500;
        }
        
        .expiry-notice {
            background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
            border: 2px solid #f6ad55;
            border-radius: 15px;
            padding: 20px;
            margin: 30px 0;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .expiry-notice::before {
            content: '⏰';
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 24px;
            opacity: 0.3;
        }
        
        .expiry-text {
            color: #c05621;
            font-size: 16px;
            margin: 0;
            font-weight: 500;
        }
        
        .security-notice {
            background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
            border: 2px solid #4fd1c7;
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            position: relative;
            overflow: hidden;
        }
        
        .security-notice::before {
            content: '🔒';
            position: absolute;
            top: 15px;
            right: 20px;
            font-size: 28px;
            opacity: 0.3;
        }
        
        .security-title {
            color: #234e52;
            font-weight: 600;
            font-size: 16px;
            margin: 0 0 15px 0;
        }
        
        .security-text {
            color: #234e52;
            font-size: 14px;
            margin: 0;
            line-height: 1.8;
        }
        
        .security-text::before {
            content: '✨';
            margin-right: 8px;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #4a5568;
            font-size: 14px;
            position: relative;
            z-index: 2;
        }
        
        .footer a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        
        .footer a:hover {
            color: #764ba2;
            text-decoration: underline;
        }
        
        .request-id {
            font-size: 12px;
            color: #a0aec0;
            margin-top: 15px;
            font-family: 'Courier New', monospace;
        }
        
        .anime-emoji {
            font-size: 24px;
            margin: 0 5px;
            animation: bounce 2s ease-in-out infinite;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
        }
        
        .sparkle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: #fbbf24;
            border-radius: 50%;
            animation: sparkle 2s ease-in-out infinite;
        }
        
        .sparkle:nth-child(1) { top: 20%; left: 10%; animation-delay: 0s; }
        .sparkle:nth-child(2) { top: 60%; right: 15%; animation-delay: 0.5s; }
        .sparkle:nth-child(3) { bottom: 30%; left: 20%; animation-delay: 1s; }
        
        @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0); }
            50% { opacity: 1; transform: scale(1); }
        }
        
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 25px;
            }
            .otp-code {
                font-size: 28px;
                letter-spacing: 8px;
                min-width: 200px;
                padding: 20px;
            }
            .title {
                font-size: 28px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sparkle"></div>
        <div class="sparkle"></div>
        <div class="sparkle"></div>
        
        <div class="header">
            <div class="logo">${appName}</div>
            <h1 class="title">
                <span class="anime-emoji">🎌</span>
                Your Login Code
                <span class="anime-emoji">🔐</span>
            </h1>
            <p class="subtitle">Use this magical code to complete your login adventure!</p>
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
            <p style="margin-top: 20px; font-size: 12px; color: #a0aec0;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}
