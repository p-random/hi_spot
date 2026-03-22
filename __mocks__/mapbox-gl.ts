const mockSetData = jest.fn();

const mockMap = {
  on: jest.fn((event: string, cb: Function) => {
    if (event === 'load' || event === 'style.load') cb();
    return mockMap;
  }),
  easeTo: jest.fn(),
  getSource: jest.fn(() => ({ setData: mockSetData })),
  addSource: jest.fn(),
  addLayer: jest.fn(),
  setTerrain: jest.fn(),
  remove: jest.fn(),
};

const mockMarker = {
  setLngLat: jest.fn(() => mockMarker),
  addTo: jest.fn(() => mockMarker),
  remove: jest.fn(),
  getElement: jest.fn(() => document.createElement('div')),
};

const mapboxgl = {
  accessToken: '',
  Map: jest.fn(() => mockMap),
  Marker: jest.fn(() => mockMarker),
};

export default mapboxgl;
export { mockMap, mockMarker, mockSetData };
