import { useTranslation } from "react-i18next";
// eslint-disable-next-line react/prop-types
const HistoryImage = ({ language }) => {
  return (
    <>
      <img className="history-image-desktop"
        src={`/images/WIP/History${language === "mk" ? "-mk" : ""}.png`}
        alt="History"
      />
      <img className="history-image-mobile"
        src={`/images/WIP/History-mobile${language === "mk" ? "-mk" : ""}.png`}
        alt="History Mobile"
      />
    </>
  );
};

const History = () => {
  const { i18n } = useTranslation();
  return <HistoryImage language={i18n.language} />;

 
};

export default History;
