import {Row, Col} from "antd";
import "../../styles/Tournament.css";
import TournamentCard from "./TournamentCard";

const Tournaments = () => {
    return (
        <>
        
            <Row data-aos="fade-up" className="justify-center" style={{background: "white", padding: "2rem 0"}}>
                <Col className="component-title-line mb-3" span={20} style={{color: "black"}}>
                    <h1 className="page-titles">Tournaments</h1>
                    <span className="see-all">See all</span>
                </Col>
                <Col span={20}>
                <TournamentCard/>
                </Col>
            </Row>
        </>
    );
};

export default Tournaments;