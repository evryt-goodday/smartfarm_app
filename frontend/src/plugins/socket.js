import { io } from 'socket.io-client';

class SocketService {
	constructor() {
		this.socket = null;
		this.connected = false;
		this.currentHouseId = null;
	}

	connect() {
		if(this.socket && this.connected){
			console.log("Socket already connected");
			return;
		}
		
		this.socket = io('http://localhost:3000', {
			transports: ['websocket'],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionAttempts: 5,
		})
		

		this.socket.on('connect', () => {
			this.connected = true;
			console.log('Socket connected:', this.socket.id);

			if(this.currentHouseId){
				this.subscribeToHouse(this.currentHouseId);
			}
		})

		this.socket.on('disconnect', (reason) => {
			this.connected = false;
			console.log('연결 해제:', reason);
		})

		this.socket.on('reconnect_attempt', (attempt) => {
			console.log(`소켓 재연결 시도 #${attempt}`);
		})

		this.socket.on('connect_error', (error) => {
			console.error('소켓 연결 오류:', error);
		});
	}

	disconnect() {
		if(this.socket){
			this.socket.disconnect();
			this.socket = null;
			this.connected = false;
			this.currentHouseId = null;
			console.log("연결 종료");
		}
	}

	subscribeToHouse(houseId) {
		if(!this.socket || !this.connected){
			console.warn("Socket이 연결되지 않았습니다.");
			return;
		}

		if(this.currentHouseId && this.currentHouseId !== houseId){
			this.socket.emit('unsubscribe:house', this.currentHouseId);
		}

		this.socket.emit('subscribe:house', houseId);
		this.currentHouseId = houseId;
		console.log(`하우스 ${houseId} 구독`);
	}

	unsubscribeFromHouse(houseId) {
		if(this.socket && this.connected){
			this.socket.emit('unsubscribe:house', houseId);
			console.log(`하우스 ${houseId} 구독 해제`);
		}
		this.currentHouseId = null;
	}

  onSensorUpdate(callback) {
    if (this.socket) {
      this.socket.on('sensor:update', callback)
    }
  }

  onActuatorUpdate(callback) {
    if (this.socket) {
      this.socket.on('actuator:update', callback)
    }
  }

  onAlert(callback) {
    if (this.socket) {
      this.socket.on('alert:new', callback)
    }
  }

  off(eventName) {
    if (this.socket) {
      this.socket.off(eventName)
    }
  }

  isConnected() {
    return this.connected
  }
}

const socketService = new SocketService();

export default socketService;