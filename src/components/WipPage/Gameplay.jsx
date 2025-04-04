import { useTranslation } from "react-i18next";
// eslint-disable-next-line react/prop-types
const GameplayImage = ({ language }) => {
  return (
    <>
      <img className="history-image-desktop"
        src={`/images/WIP/Gameplay${language === "mk" ? "-mk" : ""}.png`}
        alt="Gameplay"
      />
      <img className="history-image-mobile"
        src={`/images/WIP/Gameplay-mobile${language === "mk" ? "-mk" : ""}.png`}
        alt="Gameplay Mobile"
      />
    </>
  );
};

const Gameplay = () => {
  const { i18n } = useTranslation();
  return <GameplayImage language={i18n.language} />;

 
};

export default Gameplay;