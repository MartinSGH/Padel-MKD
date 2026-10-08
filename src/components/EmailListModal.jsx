import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { buildXlsx, downloadBlob } from "../lib/xlsx";
import "../styles/EmailListModal.css";

// Preview of an email list (admin): shows the emails in a table first, with
// buttons to download them as an Excel file or copy them all at once.
const EmailListModal = ({ title, subtitle, emails, filename, onClose }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handleDownload = () => {
    const blob = buildXlsx([["Email"], ...emails.map((email) => [email])], {
      sheetName: "Emails",
      columnWidths: [40],
    });
    downloadBlob(blob, filename);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(emails.join("; "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert(t("emailList.copyFailed"));
    }
  };

  return createPortal(
    <div className="email-modal-overlay" onMouseDown={onClose}>
      <div
        className="email-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="email-modal-header">
          <div>
            <h2 id="email-modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="email-modal-close"
            onClick={onClose}
            aria-label={t("emailList.close")}
          >
            ×
          </button>
        </div>

        <div className="email-modal-count">
          {emails.length} {t("emailList.count")}
        </div>

        <div className="email-modal-table-wrap">
          {emails.length === 0 ? (
            <p className="email-modal-empty">{t("emailList.empty")}</p>
          ) : (
            <table className="email-modal-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email, i) => (
                  <tr key={email}>
                    <td className="email-modal-num">{i + 1}</td>
                    <td>{email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="email-modal-actions">
          <button
            type="button"
            className="email-modal-btn email-modal-btn-ghost"
            onClick={handleCopy}
            disabled={emails.length === 0}
          >
            {copied ? t("emailList.copied") : t("emailList.copy")}
          </button>
          <button
            type="button"
            className="email-modal-btn email-modal-btn-primary"
            onClick={handleDownload}
            disabled={emails.length === 0}
          >
            {t("emailList.download")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

EmailListModal.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  emails: PropTypes.arrayOf(PropTypes.string).isRequired,
  filename: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default EmailListModal;
