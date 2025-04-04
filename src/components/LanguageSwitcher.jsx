import { useTranslation } from "react-i18next";

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <button onClick={() => changeLanguage("en")}>EN</button>
      <span>|</span>
      <button onClick={() => changeLanguage("mk")}>MK</button>
    </div>
  );
};

export default LanguageSwitcher;
