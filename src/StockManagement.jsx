import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Upload,
  FileSpreadsheet,
  TrendingUp,
  Package,
  Filter,
  Download,
  X,
  PlayCircle,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function StockManagement() {
  const [stockFile, setStockFile] = useState(null);
  const [seuilFile, setSeuilFile] = useState(null);
  const [stockData, setStockData] = useState([]);
  const [seuilData, setSeuilData] = useState([]);
  const [mergedData, setMergedData] = useState([]);
  const [articlesSansSeuil, setArticlesSansSeuil] = useState([]);
  const [filterMode, setFilterMode] = useState("all");
  const [loading, setLoading] = useState(false);
  const [analyseDone, setAnalyseDone] = useState(false);

  // Lecture fichier Excel Stock
  const handleStockFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStockFile(file);
    setAnalyseDone(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setStockData(jsonData);
    } catch (error) {
      alert("Erreur lors de la lecture du fichier Stock : " + error.message);
      setStockFile(null);
    }
  };

  // Lecture fichier Excel Seuils
  const handleSeuilFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSeuilFile(file);
    setAnalyseDone(false);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      setSeuilData(jsonData);
    } catch (error) {
      alert("Erreur lors de la lecture du fichier Seuils : " + error.message);
      setSeuilFile(null);
    }
  };

  // Validation et traitement
  const handleValidation = () => {
    if (stockData.length === 0 || seuilData.length === 0) {
      alert("Veuillez charger les deux fichiers avant de valider !");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      mergeDataFiles(stockData, seuilData);
      setAnalyseDone(true);
      setLoading(false);
    }, 500);
  };

  // Fusion des deux fichiers
  const mergeDataFiles = (stock, seuils) => {
    // Créer un map des seuils par référence interne
    const seuilMap = {};
    seuils.forEach((item) => {
      // Chercher la référence dans différentes colonnes possibles
      const reference =
        item["Reference interne"] ||
        item["Référence interne"] ||
        item["Reference"] ||
        item["Référence"] ||
        item.Reference ||
        item.Référence ||
        item.Pièce ||
        item.Piece ||
        item.Article;
      const seuil =
        item["Seuil (U)"] ||
        item.Seuil ||
        item.seuil ||
        item.SEUIL ||
        item.Minimum ||
        item["Quantité seuil"];

      // Ignorer les lignes vides
      if (
        reference &&
        String(reference).trim() !== "" &&
        seuil !== undefined &&
        seuil !== ""
      ) {
        const referenceKey = String(reference).trim().toLowerCase();
        seuilMap[referenceKey] = parseFloat(seuil) || 0;
      }
    });

    // Fusionner avec les données de stock
    const merged = [];
    const articlesSansSeuil = [];

    stock.forEach((item, index) => {
      // Chercher la référence interne dans différentes colonnes possibles
      const reference =
        item["Reference interne"] ||
        item["Référence interne"] ||
        item["Reference"] ||
        item["Référence"] ||
        item.Reference ||
        item.Référence ||
        item.Pièce ||
        item.Piece ||
        item.Article;
      const qte =
        item["Quantité en stock"] ||
        item["Quantite en stock"] ||
        item["Quantité Stock"] ||
        item["Quantite Stock"] ||
        item.Quantité ||
        item.Quantite ||
        item.Stock ||
        item.QTE;

      // Ignorer les lignes vides
      if (!reference || String(reference).trim() === "") {
        return;
      }

      const referenceKey = String(reference).trim().toLowerCase();
      const quantite = parseFloat(qte) || 0;
      const seuil = seuilMap[referenceKey];

      if (seuil !== undefined) {
        // Article avec seuil défini
        merged.push({
          id: index + 1,
          piece: reference,
          quantite: quantite,
          seuil: seuil,
          statut: quantite < seuil ? "alerte" : "ok",
        });
      } else {
        // Article sans seuil
        articlesSansSeuil.push({
          id: index + 1,
          piece: reference,
          quantite: quantite,
        });
      }
    });

    setMergedData(merged);
    setArticlesSansSeuil(articlesSansSeuil);
  };

  const getFilteredData = () => {
    if (filterMode === "alerte") {
      return mergedData.filter((item) => item.statut === "alerte");
    } else if (filterMode === "ok") {
      return mergedData.filter((item) => item.statut === "ok");
    }
    return mergedData;
  };

  const getPriority = (quantite, seuil) => {
    if (quantite >= seuil)
      return { label: "Aucune", color: "text-green-600", bg: "bg-green-50" };
    const ratio = quantite / seuil;
    if (ratio < 0.3)
      return {
        label: "🔴 Haute",
        color: "text-red-600 font-bold",
        bg: "bg-red-50",
      };
    if (ratio < 0.6)
      return {
        label: "🟠 Moyenne",
        color: "text-orange-600",
        bg: "bg-orange-50",
      };
    return { label: "🟡 Basse", color: "text-yellow-600", bg: "bg-yellow-50" };
  };

  const getSecurityPercent = (quantite, seuil) => {
    if (seuil === 0) return "N/A";
    return Math.round((quantite / seuil) * 100) + " %";
  };

  const exportResults = () => {
    const dataToExport = getFilteredData().map((item) => ({
      "Référence interne": item.piece,
      "Quantité en stock": item.quantite,
      "Seuil (U)": item.seuil,
      Commentaire:
        item.statut === "alerte"
          ? "Demande d'achat nécessaire"
          : "Stock suffisant",
      Statut: item.statut === "alerte" ? "ALERTE" : "OK",
      Priorité: getPriority(item.quantite, item.seuil).label,
      "% Sécurité": getSecurityPercent(item.quantite, item.seuil),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Analyse Stock");
    XLSX.writeFile(
      wb,
      `analyse_stock_${new Date().toISOString().split("T")[0]}.xlsx`
    );
  };

  const resetAll = () => {
    setStockFile(null);
    setSeuilFile(null);
    setStockData([]);
    setSeuilData([]);
    setMergedData([]);
    setArticlesSansSeuil([]);
    setFilterMode("all");
    setAnalyseDone(false);
  };

  const filteredData = getFilteredData();
  const stats = {
    total: mergedData.length,
    alertes: mergedData.filter((item) => item.statut === "alerte").length,
    ok: mergedData.filter((item) => item.statut === "ok").length,
  };
  stats.percentAlerte =
    stats.total > 0 ? Math.round((stats.alertes / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          {/* Logo RAM Handling */}
          <div className="text-center mb-8">
            <img
              src="https://cdn-kdbdd.nitrocdn.com/SvWFclJfHxSKObrtugLZmNKofnNMqkvK/assets/images/optimized/rev-ddadf4d/ramhandling.com/wp-content/uploads/2023/07/ramh_handling_new_logo_310_138.png"
              alt="RAM Handling Logo"
              className="mx-auto h-24 mb-3 drop-shadow-lg"
            />
            <p className="text-gray-600 text-sm font-medium">
              Gestion de Stock - Magasin GSE
            </p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm text-gray-500 mt-1">
                  Importez vos deux fichiers Excel et validez pour analyser
                </p>
              </div>
            </div>
            {analyseDone && (
              <button
                onClick={resetAll}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                <X className="w-4 h-4" />
                Réinitialiser
              </button>
            )}
          </div>

          {/* Zone d'upload */}
          {!analyseDone && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Upload Stock */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition ${
                    stockFile
                      ? "border-blue-500 bg-blue-50"
                      : "border-blue-300 hover:border-blue-500"
                  }`}
                >
                  <div className="text-center">
                    <FileSpreadsheet
                      className={`w-12 h-12 mx-auto mb-3 ${
                        stockFile ? "text-blue-600" : "text-gray-400"
                      }`}
                    />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Fichier 1 : Stock Actuel
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Colonnes : <strong>Reference interne</strong> |{" "}
                      <strong>Quantité en stock</strong>
                    </p>
                    <label
                      className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg transition ${
                        stockFile
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      <Upload className="w-5 h-5" />
                      {stockFile ? `✓ ${stockFile.name}` : "Choisir fichier"}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleStockFile}
                        className="hidden"
                      />
                    </label>
                    {stockData.length > 0 && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ {stockData.length} articles chargés
                      </p>
                    )}
                  </div>
                </div>

                {/* Upload Seuils */}
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition ${
                    seuilFile
                      ? "border-green-500 bg-green-50"
                      : "border-green-300 hover:border-green-500"
                  }`}
                >
                  <div className="text-center">
                    <FileSpreadsheet
                      className={`w-12 h-12 mx-auto mb-3 ${
                        seuilFile ? "text-green-600" : "text-gray-400"
                      }`}
                    />
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      Fichier 2 : Seuils Minimums
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Colonnes : <strong>Reference interne</strong> |{" "}
                      <strong>Seuil (U)</strong>
                    </p>
                    <label
                      className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-lg transition ${
                        seuilFile
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      <Upload className="w-5 h-5" />
                      {seuilFile ? `✓ ${seuilFile.name}` : "Choisir fichier"}
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleSeuilFile}
                        className="hidden"
                      />
                    </label>
                    {seuilData.length > 0 && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ {seuilData.length} seuils chargés
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bouton Validation */}
              <div className="text-center">
                <button
                  onClick={handleValidation}
                  disabled={!stockFile || !seuilFile || loading}
                  className={`inline-flex items-center gap-3 px-8 py-4 rounded-lg text-lg font-semibold transition-all transform ${
                    stockFile && seuilFile && !loading
                      ? "bg-gradient-to-r from-blue-600 to-green-600 text-white hover:scale-105 hover:shadow-xl"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin w-6 h-6 border-4 border-white border-t-transparent rounded-full"></div>
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-6 h-6" />
                      Valider et Analyser
                    </>
                  )}
                </button>
                {!stockFile || !seuilFile ? (
                  <p className="text-sm text-gray-500 mt-3">
                    ⚠️ Veuillez charger les deux fichiers avant de valider
                  </p>
                ) : null}
              </div>

              {/* Instructions */}
              
            </>
          )}
        </div>

        {/* Résultats après validation */}
        {analyseDone && mergedData.length > 0 && (
          <>
            {/* Stats */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-600">Total pièces</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {stats.total}
                  </p>
                </div>

                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-gray-600">
                      Pièces en alerte
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {stats.alertes}
                  </p>
                </div>

                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">Pièces OK</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {stats.ok}
                  </p>
                </div>

                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                    <span className="text-sm text-gray-600">% en alerte</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-600 mt-1">
                    {stats.percentAlerte}%
                  </p>
                </div>
              </div>
            </div>

            {/* Filtres et Export */}
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Filtrer :
                  </span>
                  <button
                    onClick={() => setFilterMode("all")}
                    className={`px-4 py-2 rounded-lg transition ${
                      filterMode === "all"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Tous ({stats.total})
                  </button>
                  <button
                    onClick={() => setFilterMode("alerte")}
                    className={`px-4 py-2 rounded-lg transition ${
                      filterMode === "alerte"
                        ? "bg-red-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    🔴 Alertes ({stats.alertes})
                  </button>
                  <button
                    onClick={() => setFilterMode("ok")}
                    className={`px-4 py-2 rounded-lg transition ${
                      filterMode === "ok"
                        ? "bg-green-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    ✅ OK ({stats.ok})
                  </button>
                </div>
                <button
                  onClick={exportResults}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  <Download className="w-4 h-4" />
                  Exporter Excel
                </button>
              </div>
            </div>

            {/* Tableau */}
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-800 text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left">Référence interne</th>
                      <th className="px-4 py-3 text-center">
                        Quantité en stock
                      </th>
                      <th className="px-4 py-3 text-center">Seuil (U)</th>
                      <th className="px-4 py-3 text-left">Commentaire</th>
                      <th className="px-4 py-3 text-center">Statut</th>
                      <th className="px-4 py-3 text-center">Priorité</th>
                      <th className="px-4 py-3 text-center">% Sécurité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => {
                      const priority = getPriority(item.quantite, item.seuil);
                      const rowClass =
                        item.statut === "alerte"
                          ? "bg-red-50 hover:bg-red-100"
                          : "bg-green-50 hover:bg-green-100";

                      return (
                        <tr
                          key={item.id}
                          className={`${rowClass} border-b transition`}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {item.piece}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-lg">
                            {item.quantite}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-lg">
                            {item.seuil}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                item.statut === "alerte"
                                  ? "text-red-700 font-medium"
                                  : "text-green-700"
                              }
                            >
                              {item.statut === "alerte"
                                ? "Demande d'achat nécessaire"
                                : "Stock suffisant"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.statut === "alerte" ? (
                              <span className="inline-flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                                <AlertCircle className="w-4 h-4" />
                                ALERTE
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                OK
                              </span>
                            )}
                          </td>
                          <td
                            className={`px-4 py-3 text-center ${priority.color}`}
                          >
                            {priority.label}
                          </td>
                          <td className="px-4 py-3 text-center font-medium text-lg">
                            {getSecurityPercent(item.quantite, item.seuil)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="bg-gray-50 px-4 py-3 text-sm text-gray-600 border-t">
                Affichage de {filteredData.length} pièce(s) sur {stats.total}{" "}
                total
              </div>
            </div>
          </>
        )}

        {/* Section Articles sans seuil */}
        {analyseDone && articlesSansSeuil.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mt-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-500" />
              <h3 className="text-xl font-bold text-gray-800">
                Articles sans seuil défini ({articlesSansSeuil.length})
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Ces articles sont présents dans le stock mais n'ont pas de seuil
              correspondant dans le fichier des seuils.
            </p>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-orange-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-700">
                      Référence interne
                    </th>
                    <th className="px-4 py-3 text-center text-gray-700">
                      Quantité en stock
                    </th>
                    <th className="px-4 py-3 text-left text-gray-700">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {articlesSansSeuil.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b hover:bg-orange-50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {item.piece}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-lg">
                        {item.quantite}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">
                          <AlertCircle className="w-4 h-4" />
                          Seuil non défini
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
