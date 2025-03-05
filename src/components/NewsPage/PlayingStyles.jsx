import { Row, Col } from "antd";
import Sponsors from "../LandingPage/Sponsors";
const PlayingStyles = () => {
  return (
    <>
      <div className="image-container">
        <img
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          className="landing-image-desktop"
          src="/images/NewsImages/PsLanding.svg"
          alt="Landing Image"
        />
        <img
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          className="landing-image-mobile"
          src="/images/NewsImages/PsLanding-mobile.svg"
          alt=""
        />
      </div>
      <Row justify={"center"} className="my-5">
        <Col span={20} className="ps-text d-flex flex-column gap-3">
          <p>
            In an interview with Diary, the professional player Pablo Lijo, 50nd
            world player, shared his views on the differences in playing style
            between the two main world padel circuits: Premier Padel et A1
            Padel. Indeed, the Spaniard is used to playing both circuits and it
            is true that there is a notable difference in playing style between
            the two circuits.
          </p>
          <p>
            <span className="font-bold">
              A1 Padel : a more conservative game
            </span>{" "}
            <br />
            The circuit A1 Padel is characterized by a style of play focused on
            construction of the point, which Lijo describes as a game
            &quot;conservative &quot;. This means that players are looking more
            for ensure the point, sometimes taking fewer risks and playing in a
            more calculated manner. This style emphasizes the patience and
            construction of the point, often using moves such as the lob to slow
            strips to recover the net. The pace is also slower, with long
            exchanges, where the main objective is to not to make mistakes.
          </p>
          <p>
            In this style of play, we find players such as Maximilian Maple ou
            Adrian Allemandi. Despite everything, we also see exceptional
            points, with genius players present on the circuit, like Gonzalo
            Alfonso ou Tolito Aguirre, capable of crazy actions.
          </p>
          This more thoughtful style does not mean that it is less competitive.
          In fact, the circuit A1 Padel also brings together very high-level
          players, capable of mastering these long phases of strategic play.
          Fans of this circuit appreciate the technicality and subtlety of
          points, often marked by reversals of fortune after prolonged
          exchanges.
          <p>
            We could compare this style of play to padel. vintage , which was
            also based on point construction and where risk taking was lower.
            Fernando Belasteguin is the perfect illustration of this, just like
            Adrian Allemandi, former player of World Padel Tour, which has been
            able to adapt perfectly to theA1 Padel.
          </p>
          <img
            className="ps-image w-full h-full"
            src="/images/NewsImages/PsImage.svg"
            alt=""
          />
          <br />
          <p>
            <span className="font-bold">
              Premier Padel : a more aggressive and fast game
            </span>{" "}
            <br />
            On the contrary, the circuit Premier Padel is distinguished by a
            much more play aggressive et rhythm. Players on this circuit tend to
            take more risks, going faster to the shock and seeking to finish the
            points in a more decisiveThe game is more direct, with powerful
            strikes and many smashes. As soon as there is an opportunity to
            conclude the point, players do not hesitate to try risky shots to
            achieve it. The world number 1s, Tapia/Coello, are the perfect
            illustration of this, adopting a very offensive style of play and
            quickly projecting themselves forward.
          </p>
          <p>
            The circuit Premier Padel therefore highlights a style more
            offensive, where players do not only seek to keep the ball in play,
            but to take the upper hand from the first shots. This gives rise to
            explosive matches, where the level of play is simply enormous,
            because the players have very little waste for a very aggressive
            game, which is why they are the best players in the world.
          </p>
          <p>
            That said, the so-called &quot; travailleurs » still have their
            place on this circuit. Indeed, players like Coki Nieto ou Maxi
            Sanchez are among the best in the world thanks to their consistency
            and ability to build points well. However, it is legitimate to
            wonder if padel is not definitely moving towards a more explosive
            style of play. Indeed, the young rising stars of padel, such as Leo
            Augsburger, Alex Chozas, or paul cardona, are all players with a
            playing style aggressive, with a huge smash, leaving little room for
            more strategic players to reach the top of the world rankings.
          </p>
          <p className="mb-5">
            <span className="font-bold">Do not compare the two circuits</span>
            <br />
            It is important to note that, according to Pablo Lijó, these two
            styles should not be compared to determine which is better than the
            other. &quot;This does not mean that Premier is better than
            A1&quot;, he says. They are simply two different approaches to
            padel, each with its own particularities and followers.
          </p>
          <p className="source">
            Source: Benjamin Dupouy, &quot;Differences in playing style between <br />
            Premier Padel and A1 Padel&quot;, Padel Magaine
          </p>
        </Col>
      </Row>
      <Sponsors />
    </>
  );
};

export default PlayingStyles;
