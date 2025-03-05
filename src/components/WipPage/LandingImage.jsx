import "../../styles/Wip-Landing.css";
const LandingImage = () => {
  return (
    <div className="image-container">
      <img
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        className="landing-image-desktop"
        src="/images/WIP/Wip-Landing.jpg"
        alt="Landing Image"
      />
      <img
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        className="landing-image-mobile"
        src="/images/WIP/Wip-Landing-mobile.svg"
        alt=""
      />
    </div>
  );
};
export default LandingImage;
