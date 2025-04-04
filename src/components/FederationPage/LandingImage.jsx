// eslint-disable-next-line react/prop-types
const LandingImage = ({ imageSrc }) => {
  return (
    <div>
      <img 
        style={{ width: "100%" }}
        className="landing-image"
        src={imageSrc}
        alt="Landing Image"
      />
    </div>
  );
};
export default LandingImage;