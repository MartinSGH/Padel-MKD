import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Spin } from "antd";
import { useTranslation } from "react-i18next";
import { unsubscribeFromEmails } from "../services/newsletter";
import "../styles/AllNews.css";

// Landing page of the "Unsubscribe" link at the bottom of every email.
const Unsubscribe = () => {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState({ status: "working", email: "" });

  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", email: "" });
      return;
    }
    unsubscribeFromEmails(token)
      .then((email) =>
        setState(
          email ? { status: "done", email } : { status: "invalid", email: "" },
        ),
      )
      .catch(() => setState({ status: "invalid", email: "" }));
  }, [token]);

  return (
    <div className="an-page an-status">
      <h1 className="gallery-h1">{t("unsubscribe.title")}</h1>
      {state.status === "working" ? (
        <>
          <Spin size="large" />
          <p>{t("unsubscribe.working")}</p>
        </>
      ) : state.status === "done" ? (
        <>
          <p>{t("unsubscribe.done", { email: state.email })}</p>
          <p>{t("unsubscribe.resubscribe")}</p>
        </>
      ) : (
        <p>{t("unsubscribe.invalid")}</p>
      )}
      <Link to="/" className="gd-back">
        ← {t("unsubscribe.back")}
      </Link>
    </div>
  );
};

export default Unsubscribe;
