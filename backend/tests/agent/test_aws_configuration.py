from app.agent.model import create_strands_agent


def test_bedrock_agent_caps_output_tokens() -> None:
    agent = create_strands_agent(
        model_id="amazon.nova-micro-v1:0",
        region_name="us-east-1",
    )

    assert agent.model.config["model_id"] == "amazon.nova-micro-v1:0"
    assert agent.model.config["max_tokens"] == 512
