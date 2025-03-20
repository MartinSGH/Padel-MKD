import {Row, Col} from "antd";
import "../../styles/Sponsors.css";
const Sponsors = () => {
    return (
        <>
            <Row data-aos="fade-up" className="justify-center" > 
                <Col span={24} className="w-100">
                <img className="sponsors-image desktop-image" src="/images/Sponsors/Sponsors.svg" alt="" />
                <img className="sponsors-image mobile-image" src="/images/Sponsors/Sponsors-mobile.svg" alt="" />
                </Col>
            </Row>
        </>
    );
};  

export default Sponsors