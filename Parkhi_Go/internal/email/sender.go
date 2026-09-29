package email

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"net/smtp"
	"time"

	"yukti/backend/internal/config"
	"yukti/backend/pkg/logger"

	"github.com/google/uuid"
)

type EmailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (s *EmailService) SendReportEmail(toEmail, jobID string, pdfBytes []byte, tiffBytes []byte) error {
	shortID := jobID
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}
	subject := fmt.Sprintf("Parkhi Earth Observation: Periodic Monitoring Report [%s]", shortID)
	
	geotiffBullet := "<li>Direct link to download the 16-bit uint16 L2A DN scientific GeoTIFF</li>"
	if len(tiffBytes) > 0 {
		geotiffBullet = fmt.Sprintf("<li><strong>Original 16-bit GeoTIFF:</strong> Attached directly (<code>Parkhi_GeoTIFF_%s.tif</code>) for analysis in QGIS / ArcGIS</li>", shortID)
	}

	body := fmt.Sprintf(`
      <p>Hello,</p>
      <p>Your periodic Sentinel-2 super-resolution surveillance cycle for Job ID <strong>%s</strong> has completed successfully.</p>
      <p>A comprehensive PDF intelligence dossier is attached to this email. It contains:</p>
      <ul>
        <li>5-meter True-Color RGB Visual Preview (2x MCDropoutHAT Super-Resolution)</li>
        <li>Current GeoTIFF Telemetry and 16-bit uint16 L2A physical spectral values (B02, B03, B04, B08)</li>
        <li>Epistemic Uncertainty Heatmap for reliable inference assessment</li>
        <li>Physical quality metrics: PSNR, SSIM, SAM, and ERGAS</li>
        %s
      </ul>
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 20px 0; border-radius: 4px;">
        <span style="font-size: 12px; color: #1e40af;">Physical reflectances strictly preserved with zero external cloud enhancement dependencies. Recurring updates will arrive every 3 hours.</span>
      </div>`, jobID, geotiffBullet)

	return s.sendEmailMIME(toEmail, subject, "Automated Periodic Area Surveillance Report", body, shortID, pdfBytes, tiffBytes)
}

func (s *EmailService) SendInitialReportEmail(toEmail, jobID string, pdfBytes []byte, tiffBytes []byte) error {
	shortID := jobID
	if len(shortID) > 8 {
		shortID = shortID[:8]
	}
	subject := fmt.Sprintf("Parkhi Earth Observation: Initial Surveillance Dossier & GeoTIFF Telemetry [%s]", shortID)

	geotiffBullet := "<li>Current 16-bit uint16 L2A spectral values across all bands</li>"
	if len(tiffBytes) > 0 {
		geotiffBullet = fmt.Sprintf("<li><strong>Original Scientific GeoTIFF:</strong> Attached directly (<code>Parkhi_GeoTIFF_%s.tif</code>) for opening in QGIS / ArcGIS</li>", shortID)
	}

	body := fmt.Sprintf(`
      <p>Hello,</p>
      <p>Thank you for subscribing to Parkhi Automated Area Surveillance. Your subscription has been successfully registered.</p>
      <p>As requested, here is your immediate <strong>Initial Surveillance & Current GeoTIFF Telemetry Dossier</strong> for Job ID <strong>%s</strong>, dispatched instantly so you do not have to wait 3 hours for the first cycle to inspect satellite data values.</p>
      <p>The attached PDF report contains comprehensive scientific analysis and current GeoTIFF telemetry:</p>
      <ul>
        <li><strong>Spatial Resolution:</strong> 5.0m Ground Sampling Distance (2x MCDropoutHAT Super-Resolution)</li>
        <li><strong>Current GeoTIFF Telemetry:</strong> 16-bit uint16 L2A Bottom-Of-Atmosphere spectral values for Bands B02 (Blue), B03 (Green), B04 (Red), and B08 (NIR)</li>
        <li><strong>Physical Quality Indices:</strong> Verified PSNR, SSIM, SAM, and ERGAS metrics</li>
        <li><strong>Epistemic Uncertainty:</strong> Heatmap assessing model confidence</li>
        %s
      </ul>
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 20px 0; border-radius: 4px;">
        <span style="font-size: 12px; color: #1e40af;">Physical reflectances strictly preserved with zero external cloud dependencies. Recurring surveillance cycles will run every 3 hours.</span>
      </div>`, jobID, geotiffBullet)

	return s.sendEmailMIME(toEmail, subject, "Subscription Confirmed - Initial Surveillance Dossier", body, shortID, pdfBytes, tiffBytes)
}

func (s *EmailService) sendEmailMIME(toEmail, subject, subtitle, bodyHTML, shortID string, pdfBytes []byte, tiffBytes []byte) error {
	if s.cfg.SMTPHost == "" || s.cfg.SMTPUser == "" {
		logger.Warn("SMTP not configured (SMTP_HOST or SMTP_USER is empty). Skipping email dispatch to %s", toEmail)
		return nil
	}

	from := s.cfg.SMTPUser
	boundary := "PARKHI_MIME_BOUNDARY_" + uuid.New().String()

	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("From: %s\r\n", from))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", toEmail))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n\r\n", boundary))

	// HTML Body Part
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	buf.WriteString("Content-Transfer-Encoding: 7bit\r\n\r\n")
	buf.WriteString(fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #0f172a; padding: 20px; color: #ffffff;">
      <h2 style="margin: 0; font-size: 20px;">Parkhi Earth Observation Platform</h2>
      <p style="margin: 5px 0 0 0; font-size: 13px; color: #94a3b8;">%s</p>
    </div>
    <div style="padding: 24px; color: #334155; font-size: 14px; line-height: 1.6;">
      %s
      <p style="font-size: 12px; color: #64748b; margin-top: 30px;">
        Timestamp: %s UTC<br>
        This email was automatically generated by your active Parkhi area subscription.
      </p>
    </div>
  </div>
</body>
</html>
`, subtitle, bodyHTML, time.Now().UTC().Format(time.RFC1123)))
	buf.WriteString("\r\n\r\n")

	// PDF Attachment Part
	pdfFilename := fmt.Sprintf("Parkhi_Intelligence_Report_%s.pdf", shortID)
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: application/pdf; name=\"" + pdfFilename + "\"\r\n")
	buf.WriteString("Content-Disposition: attachment; filename=\"" + pdfFilename + "\"\r\n")
	buf.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")

	b64PDF := base64.StdEncoding.EncodeToString(pdfBytes)
	for i := 0; i < len(b64PDF); i += 76 {
		end := i + 76
		if end > len(b64PDF) {
			end = len(b64PDF)
		}
		buf.WriteString(b64PDF[i:end] + "\r\n")
	}

	// GeoTIFF Attachment Part (if provided)
	if len(tiffBytes) > 0 {
		tiffFilename := fmt.Sprintf("Parkhi_GeoTIFF_%s.tif", shortID)
		buf.WriteString(fmt.Sprintf("\r\n--%s\r\n", boundary))
		buf.WriteString("Content-Type: image/tiff; name=\"" + tiffFilename + "\"\r\n")
		buf.WriteString("Content-Disposition: attachment; filename=\"" + tiffFilename + "\"\r\n")
		buf.WriteString("Content-Transfer-Encoding: base64\r\n\r\n")

		b64Tiff := base64.StdEncoding.EncodeToString(tiffBytes)
		for i := 0; i < len(b64Tiff); i += 76 {
			end := i + 76
			if end > len(b64Tiff) {
				end = len(b64Tiff)
			}
			buf.WriteString(b64Tiff[i:end] + "\r\n")
		}
	}

	buf.WriteString(fmt.Sprintf("\r\n--%s--\r\n", boundary))

	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	var auth smtp.Auth
	if s.cfg.SMTPPass != "" {
		auth = smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPass, s.cfg.SMTPHost)
	}

	if err := smtp.SendMail(addr, auth, from, []string{toEmail}, buf.Bytes()); err != nil {
		return fmt.Errorf("smtp dispatch failed to %s: %w", toEmail, err)
	}

	logger.Info("Successfully dispatched intelligence dossier to %s (Subject: %s, Attachments: PDF=%d bytes, TIFF=%d bytes)",
		toEmail, subject, len(pdfBytes), len(tiffBytes))
	return nil
}
