import { Card, Empty, Typography } from 'antd';

const { Text } = Typography;

export default function ComingSoon() {
  return (
    <Card>
      <Empty
        description={
          <Text type="secondary">
            This section is planned for a later Phase 1 story. Vendors is
            available now.
          </Text>
        }
      />
    </Card>
  );
}
