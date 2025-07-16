package com.btalk.service;

import com.btalk.dto.request.CallRequest;

public interface CallService {
	void initiateCall(CallRequest request);
	void notifyPrivateCall(CallRequest request);
	void notifyGroupCall(CallRequest request);
	void answerCall(CallRequest request);
	void rejectCall(CallRequest request);
	void endCall(CallRequest request);
}
