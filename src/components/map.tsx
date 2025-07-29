import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '../index.css';
import '../css/PinModal.css';

// Pin categories
type PinCategory = 'restaurant' | 'bar' | 'beach' | 'travel' | 'activity';

// Pins
interface Pin {
  id: number;
  lat: number;
  lng: number;
  title: string;
  description: string;
  category: PinCategory;
  address?: string;
}

// Map clicks
const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Create dynamic marker icons based on category
const getCategoryIcon = (category: PinCategory) => {
  const iconMap = {
    restaurant: '🍽️',
    bar: '🍺',
    beach: '🏖️',
    travel: '✈️',
    activity: '⚽'
  };
  
  return L.divIcon({
    html: `<div style="font-size: 24px;">${iconMap[category]}</div>`,
    iconSize: [80, 80],
    iconAnchor: [15, 30],
    className: 'custom-marker'
  });
};

// Function to convert address text into a hyperlink
const createAddressLink = (address: string, lat: number, lng: number): string => {
  // Create Google Maps link
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  
  // Get street + city only (skip postal codes, country, etc.)
  const parts = address.split(',');
  const shortAddress = parts.slice(0, 2).join(' ').trim();
  
  // Return HTML string with clickable link
  return `<a href="${googleMapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: underline;">${shortAddress}</a>`;
};

// Get address from coordinates using reverse geocoding
const getAddress = async (lat: number, lng: number): Promise<string> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
  );
  const data = await response.json();
  const address = data.display_name || 'Address not found';
  
  // Apply the hyperlink function to the address
  return createAddressLink(address, lat, lng);
};

const Map: React.FC = () => {
  const position: [number, number] = [43.64288135247436, -79.387089011289];
  
  // State to store all pins
  const [pins, setPins] = useState<Pin[]>([]);
  
  // State for the pin creation modal
  const [showModal, setShowModal] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [pinTitle, setPinTitle] = useState('');
  const [pinDescription, setPinDescription] = useState('');
  const [pinCategory, setPinCategory] = useState<PinCategory>('restaurant');
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  
  // State for editing pins
  const [editingPin, setEditingPin] = useState<Pin | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Function to handle map click - opens modal
  const handleMapClick = (lat: number, lng: number) => {
    setPendingPin({ lat, lng });
    setShowModal(true);
    setPinTitle('');
    setPinDescription('');
    setPinCategory('restaurant');
  };

  // Function to add a new pin after form submission
  const addPin = async () => {
    if (pendingPin && pinTitle.trim()) {
      setIsLoadingAddress(true);
      
      // Get address from coordinates
      const address = await getAddress(pendingPin.lat, pendingPin.lng);
      
      const newPin: Pin = {
        id: Date.now(), 
        lat: pendingPin.lat,
        lng: pendingPin.lng,
        title: pinTitle.trim(),
        description: pinDescription.trim(),
        category: pinCategory,
        address: address
      };
      
      setPins([...pins, newPin]);
      setShowModal(false);
      setPendingPin(null);
      setPinTitle('');
      setPinDescription('');
      setPinCategory('restaurant');
      setIsLoadingAddress(false);
    }
  };

  // Function to cancel pin creation
  const cancelPin = () => {
    setShowModal(false);
    setPendingPin(null);
    setPinTitle('');
    setPinDescription('');
    setPinCategory('restaurant');
    setIsLoadingAddress(false);
  };

  // Function to delete a pin
  const deletePin = (pinId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    if (window.confirm('Are you sure you want to delete this pin?')) {
      setPins(pins.filter(pin => pin.id !== pinId));
    }
  };

  // Function to start editing a pin
  const editPin = (pin: Pin, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent event bubbling
    setEditingPin(pin);
    setPinTitle(pin.title);
    setPinDescription(pin.description);
    setPinCategory(pin.category);
    setShowEditModal(true);
  };

  // Function to update an existing pin
  const updatePin = async () => {
    if (editingPin && pinTitle.trim()) {
      setIsLoadingAddress(true);
      
      // Get new address if coordinates changed (for now, we keep the same address)
      const updatedPin: Pin = {
        ...editingPin,
        title: pinTitle.trim(),
        description: pinDescription.trim(),
        category: pinCategory
      };
      
      setPins(pins.map(pin => pin.id === editingPin.id ? updatedPin : pin));
      setShowEditModal(false);
      setEditingPin(null);
      setPinTitle('');
      setPinDescription('');
      setPinCategory('restaurant');
      setIsLoadingAddress(false);
    }
  };

  // Function to cancel editing
  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingPin(null);
    setPinTitle('');
    setPinDescription('');
    setPinCategory('restaurant');
    setIsLoadingAddress(false);
  };

  return (
    <div>
      <h2 className="map-title">My Interactive Map</h2>
      <p className="map-instructions">
        Click anywhere on the map to add a pin!
      </p>
      
      <MapContainer
        center={position}
        zoom={13}
        className="map-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={handleMapClick} />
        
        {pins.map((pin) => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={getCategoryIcon(pin.category)}>
            <Popup>
              <div className="popup-content">
                <div className="popup-title">{pin.title}</div>
                <div className="popup-category">Category: {pin.category}</div>
                {pin.description && (
                  <div className="popup-description">{pin.description}</div>
                )}
                {pin.address && (
                  <div 
                    className="popup-address"
                    dangerouslySetInnerHTML={{ __html: `<strong>Address:</strong> ${pin.address}` }}
                  />
                )}
                <div className="popup-actions">
                  <button onClick={(e) => editPin(pin, e)} className="btn-edit">
                    ✏️ Edit
                  </button>
                  <button onClick={(e) => deletePin(pin.id, e)} className="btn-delete">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Pin Creation Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Create New Pin</h3>
            
            <div className="form-group">
              <label className="form-label">
                Category *
              </label>
              <select
                value={pinCategory}
                onChange={(e) => setPinCategory(e.target.value as PinCategory)}
                className="form-input"
              >
                <option value="restaurant">🍽️ Restaurant</option>
                <option value="bar">🍺 Bar</option>
                <option value="beach">🏖️ Beach</option>
                <option value="travel">✈️ Travel</option>
                <option value="activity">⚽ Activity</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Title *
              </label>
              <input
                type="text"
                value={pinTitle}
                onChange={(e) => setPinTitle(e.target.value)}
                placeholder="Enter pin title"
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Description
              </label>
              <textarea
                value={pinDescription}
                onChange={(e) => setPinDescription(e.target.value)}
                placeholder="Enter pin description (optional)"
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="button-group">
              <button
                onClick={cancelPin}
                className="btn btn-cancel"
                disabled={isLoadingAddress}
              >
                Cancel
              </button>
              <button
                onClick={addPin}
                disabled={!pinTitle.trim() || isLoadingAddress}
                className={`btn btn-primary ${(!pinTitle.trim() || isLoadingAddress) ? 'disabled' : ''}`}
              >
                {isLoadingAddress ? 'Getting Address...' : 'Create Pin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pin Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Edit Pin</h3>
            
            <div className="form-group">
              <label className="form-label">
                Category *
              </label>
              <select
                value={pinCategory}
                onChange={(e) => setPinCategory(e.target.value as PinCategory)}
                className="form-input"
              >
                <option value="restaurant">🍽️ Restaurant</option>
                <option value="bar">🍺 Bar</option>
                <option value="beach">🏖️ Beach</option>
                <option value="travel">✈️ Travel</option>
                <option value="activity">⚽ Activity</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Title *
              </label>
              <input
                type="text"
                value={pinTitle}
                onChange={(e) => setPinTitle(e.target.value)}
                placeholder="Enter pin title"
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Description
              </label>
              <textarea
                value={pinDescription}
                onChange={(e) => setPinDescription(e.target.value)}
                placeholder="Enter pin description (optional)"
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="button-group">
              <button
                onClick={cancelEdit}
                className="btn btn-cancel"
                disabled={isLoadingAddress}
              >
                Cancel
              </button>
              <button
                onClick={updatePin}
                disabled={!pinTitle.trim() || isLoadingAddress}
                className={`btn btn-primary ${(!pinTitle.trim() || isLoadingAddress) ? 'disabled' : ''}`}
              >
                {isLoadingAddress ? 'Updating...' : 'Update Pin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;