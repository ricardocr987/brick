import Link from "next/link";

const MainAppsPage = () => {
    const MockedApps = [
        { label: "Fishnet", key: 1 },
        { label: "Test", key: 2 },
        { label: "Solano", key: 3 },
      ];
    return (
        <div className="apps" style={{ gap: "10px" }}>
            {MockedApps.map(route => (
                <Link href={`/app/${route.label}`} >
                    <div className="innerContainer" key={route.label} style={{ width: "150px", height: "150px" }}>
                        {route.label}
                    </div>
                </Link>
            ))}
        </div>
    )
};

export default MainAppsPage;
