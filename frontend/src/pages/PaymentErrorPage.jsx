import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';

const PaymentErrorPage = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error') || 'unknown';

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow-sm">
            <Card.Body className="text-center p-5">
              <i className="fas fa-exclamation-circle text-danger mb-4" style={{ fontSize: '3rem' }}></i>
              <Card.Title as="h2" className="mb-4">Thanh toán thất bại</Card.Title>
              <Card.Text className="mb-4">
                Đã xảy ra lỗi khi xử lý thanh toán của bạn. Vui lòng thử lại sau hoặc chọn phương thức thanh toán khác.
              </Card.Text>
              <div className="d-grid gap-2">
                <Button as={Link} to="/profile/orders" variant="primary">
                  Xem đơn hàng của tôi
                </Button>
                <Button as={Link} to="/" variant="outline-secondary">
                  Quay lại trang chủ
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default PaymentErrorPage;