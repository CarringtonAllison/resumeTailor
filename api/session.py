from models.job import PipelineState

_sessions: dict[str, PipelineState] = {}


def get_or_create(session_id: str) -> PipelineState:
    if session_id not in _sessions:
        _sessions[session_id] = PipelineState(session_id=session_id)
    return _sessions[session_id]


def get(session_id: str) -> PipelineState:
    if session_id not in _sessions:
        raise KeyError(f"Session {session_id!r} not found")
    return _sessions[session_id]
