import React, { useState } from 'react';
import { message, Button, Input, Modal, Typography, Form, Radio } from 'antd';
import { useCreateUserDefinedReportMutation } from '../../graphql/userDefinedReport.generated';
import { useEnterKeyListener } from '../shared/useEnterKeyListener';
import { UserDefinedReportType } from '../../types.generated';

type Props = {
    visible: boolean;
    onClose: () => void;
    onCreate: (id: string | undefined, name: string, type: UserDefinedReportType, description: string) => void;
};

export default function CreateUserDefinedReportModal({ visible, onClose, onCreate }: Props) {
    const [stagedName, setStagedName] = useState('');
    const [stagedType, setStagedType] = useState('PipelineTimeliness');
    const [stagedDescription, setStagedDescription] = useState('');
    const [stagedId, setStagedId] = useState<string | undefined>(undefined);
    const [createUserDefinedReportMutation] = useCreateUserDefinedReportMutation();
    const [createButtonEnabled, setCreateButtonEnabled] = useState(true);
    const [form] = Form.useForm();

    const onCreateUserDefinedReport = () => {
        createUserDefinedReportMutation({
            variables: {
                input: {
                    id: stagedId,
                    name: stagedName,
                    type: UserDefinedReportType[stagedType],
                    description: stagedDescription,
                },
            },
        })
            .catch((e) => {
                message.destroy();
                message.error({ content: `Failed to create user defined report!: \n ${e.message || ''}`, duration: 3 });
            })
            .finally(() => {
                message.success({
                    content: `Created user defined report!`,
                    duration: 3,
                });
                onCreate(stagedId, stagedName, UserDefinedReportType[stagedType], stagedDescription);
                setStagedName('');
                setStagedType('');
                setStagedDescription('');
                setStagedId(undefined);
            });
        onClose();
    };

    // Handle the Enter press
    useEnterKeyListener({
        querySelectorToExecuteClick: '#createUserDefinedReportButton',
    });

    return (
        <Modal
            title="Create new user defined report"
            visible={visible}
            onCancel={onClose}
            footer={
                <>
                    <Button onClick={onClose} type="text">
                        Cancel
                    </Button>
                    <Button
                        id="createUserDefinedReportButton"
                        onClick={onCreateUserDefinedReport}
                        disabled={createButtonEnabled}
                    >
                        Create
                    </Button>
                </>
            }
        >
            <Form
                form={form}
                initialValues={{}}
                layout="vertical"
                onFieldsChange={() =>
                    setCreateButtonEnabled(form.getFieldsError().some((field) => field.errors.length > 0))
                }
            >
                <Form.Item label={<Typography.Text strong>Name</Typography.Text>}>
                    <Typography.Paragraph>Give your new user defined report a name. </Typography.Paragraph>
                    <Form.Item
                        name="name"
                        rules={[
                            {
                                required: true,
                                message: 'Enter a user defined report name.',
                            },
                            { whitespace: true },
                            { min: 1, max: 50 },
                        ]}
                        hasFeedback
                    >
                        <Input
                            placeholder="A name for your user defined report"
                            value={stagedName}
                            onChange={(event) => setStagedName(event.target.value)}
                        />
                    </Form.Item>
                </Form.Item>
                <Form.Item label={<Typography.Text strong>Type</Typography.Text>}>
                    <Typography.Paragraph>Choose the type of your user defined report. </Typography.Paragraph>
                    <Radio.Group
                        onChange={(event) => {
                            setStagedType(event.target.value);
                        }}
                        defaultValue={stagedType}
                    >
                        <Radio.Button value="PipelineTimeliness">Pipeline Timeliness</Radio.Button>
                        <Radio.Button value="HistoricalTimeliness">Historical Timeliness</Radio.Button>
                    </Radio.Group>
                </Form.Item>
                <Form.Item label={<Typography.Text strong>Description</Typography.Text>}>
                    <Typography.Paragraph>
                        An optional description for your new user defined report. You can change this later.
                    </Typography.Paragraph>
                    <Form.Item name="description" rules={[{ whitespace: true }, { min: 1, max: 500 }]} hasFeedback>
                        <Input
                            placeholder="A description for your user defined report"
                            value={stagedDescription}
                            onChange={(event) => setStagedDescription(event.target.value)}
                        />
                    </Form.Item>
                </Form.Item>
            </Form>
        </Modal>
    );
}
