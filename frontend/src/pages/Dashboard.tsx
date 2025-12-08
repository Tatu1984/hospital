import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography } from 'antd';
import {
  UserAddOutlined,
  MedicineBoxOutlined,
  BankOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { dashboardAPI } from '../services/api';

const { Title } = Typography;

interface Stats {
  todayPatients: number;
  todayEncounters: number;
  activeAdmissions: number;
  todayRevenue: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    todayPatients: 0,
    todayEncounters: 0,
    activeAdmissions: 0,
    todayRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Today's Registrations"
              value={stats.todayPatients}
              prefix={<UserAddOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Today's Consultations"
              value={stats.todayEncounters}
              prefix={<MedicineBoxOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Active Admissions"
              value={stats.activeAdmissions}
              prefix={<BankOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Today's Revenue"
              value={stats.todayRevenue}
              prefix={<DollarOutlined />}
              precision={2}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Quick Actions" style={{ height: 300 }}>
            <p>• Register New Patient</p>
            <p>• Start OPD Consultation</p>
            <p>• Create New Admission</p>
            <p>• Generate Bill</p>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Recent Activity" style={{ height: 300 }}>
            <p>Activity feed coming soon...</p>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
