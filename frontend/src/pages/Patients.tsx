import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Typography,
  Modal,
  Form,
  DatePicker,
  Select,
  message,
  Tag,
} from 'antd';
import { PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons';
import { patientAPI } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async (search?: string) => {
    setLoading(true);
    try {
      const response = await patientAPI.getAll({ search });
      setPatients(response.data);
    } catch (error) {
      message.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadPatients(searchText);
  };

  const handleCreatePatient = async (values: any) => {
    try {
      const response = await patientAPI.create({
        ...values,
        dob: values.dob ? values.dob.format('YYYY-MM-DD') : null,
      });
      message.success('Patient registered successfully!');
      setIsModalVisible(false);
      form.resetFields();
      loadPatients();
      navigate(`/patients/${response.data.id}`);
    } catch (error) {
      message.error('Failed to register patient');
    }
  };

  const columns = [
    {
      title: 'MRN',
      dataIndex: 'mrn',
      key: 'mrn',
      width: 120,
      render: (mrn: string) => <Tag color="blue">{mrn}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Age/Gender',
      key: 'ageGender',
      render: (record: any) => {
        const age = record.dob
          ? dayjs().diff(dayjs(record.dob), 'year')
          : 'N/A';
        return `${age} / ${record.gender || 'N/A'}`;
      },
    },
    {
      title: 'Contact',
      dataIndex: 'contact',
      key: 'contact',
    },
    {
      title: 'Blood Group',
      dataIndex: 'bloodGroup',
      key: 'bloodGroup',
      render: (bg: string) => bg || '-',
    },
    {
      title: 'Registered On',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: any) => (
        <Button
          type="link"
          icon={<UserOutlined />}
          onClick={() => navigate(`/patients/${record.id}`)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <Space
          style={{
            width: '100%',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Title level={2} style={{ margin: 0 }}>
            Patients
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            Register New Patient
          </Button>
        </Space>

        <Space style={{ marginBottom: 16 }}>
          <Input
            placeholder="Search by MRN, name, or contact"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 300 }}
          />
          <Button type="primary" onClick={handleSearch}>
            Search
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={patients}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="Register New Patient"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreatePatient}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter patient name' }]}
          >
            <Input placeholder="Enter full name" />
          </Form.Item>

          <Form.Item name="dob" label="Date of Birth">
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>

          <Form.Item name="gender" label="Gender">
            <Select placeholder="Select gender">
              <Option value="Male">Male</Option>
              <Option value="Female">Female</Option>
              <Option value="Other">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="contact"
            label="Contact Number"
            rules={[{ required: true, message: 'Please enter contact number' }]}
          >
            <Input placeholder="Enter contact number" />
          </Form.Item>

          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="Enter email" />
          </Form.Item>

          <Form.Item name="address" label="Address">
            <Input.TextArea rows={2} placeholder="Enter address" />
          </Form.Item>

          <Form.Item name="bloodGroup" label="Blood Group">
            <Select placeholder="Select blood group">
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <Option key={bg} value={bg}>
                  {bg}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="allergies" label="Allergies">
            <Input.TextArea rows={2} placeholder="Enter known allergies" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Register Patient
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Patients;
